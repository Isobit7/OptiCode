import datetime
import hashlib
import logging
import secrets
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

from app.db.supabase_client import get_client
from app.llm_interface import client as llm
from app.rate_limiter import check_rate_limit

logger = logging.getLogger("code_optimizer.routes.ci")
router = APIRouter()

# Resilient in-memory fallback for API keys
_LOCAL_API_KEYS_DB: Dict[str, Dict[str, Any]] = {}


class ApiKeyCreateRequest(BaseModel):
    name: str = Field("Repo CI Key", description="Descriptive name for the API key.")


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key: Optional[str] = None  # Returned ONLY on creation
    key_prefix: str
    created_at: str


class CiScanItem(BaseModel):
    filename: Optional[str] = Field(None, description="Filename or path.")
    code: str = Field(..., description="File content or diff string.")
    language: Optional[str] = Field(None, description="Language name or extension.")


class CiScanRequest(BaseModel):
    diff_or_files: List[CiScanItem] = Field(..., description="List of code snippets or diff files to scan.")
    analysis_types: List[str] = Field(
        default_factory=lambda: ["security", "explain"],
        description="Analysis actions to run: 'security', 'explain', 'pr-review', 'flowchart'.",
    )
    repo: Optional[str] = Field(None, description="Optional GitHub repo identifier (e.g. owner/repo).")
    pr_number: Optional[int] = Field(None, description="Optional PR number.")


class CiScanResponse(BaseModel):
    github_comment_markdown: str = Field(..., description="Formatted GitHub Markdown suitable for PR comments.")
    scan_results: List[Dict[str, Any]] = Field(default_factory=list, description="Raw structured analysis findings.")


def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def _verify_api_key(api_key_header: Optional[str]) -> Dict[str, Any]:
    if not api_key_header:
        # For public/open CI testing fallback, allow anonymous scan with default rate limits
        return {"id": "anon_ci", "name": "Anonymous CI"}

    raw_key = api_key_header.replace("Bearer ", "").strip()
    key_hash = _hash_key(raw_key)

    # Check local fallback DB
    if key_hash in _LOCAL_API_KEYS_DB:
        return _LOCAL_API_KEYS_DB[key_hash]

    try:
        supabase = get_client()
        res = supabase.table("api_keys").select("*").eq("key_hash", key_hash).execute()
        if hasattr(res, "data") and res.data and len(res.data) > 0:
            return res.data[0]
    except Exception as err:
        logger.debug(f"Supabase api_keys check fallback ({err})")

    # If key header provided but invalid
    raise HTTPException(status_code=401, detail="Invalid or revoked OptiCode API Key.")


@router.post("/ci/api-keys", response_model=ApiKeyResponse)
def create_api_key(req: ApiKeyCreateRequest) -> ApiKeyResponse:
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    key_id = str(uuid.uuid4())
    raw_key = f"opti_{secrets.token_urlsafe(24)}"
    key_hash = _hash_key(raw_key)
    key_prefix = raw_key[:10] + "..."

    record = {
        "id": key_id,
        "name": req.name,
        "key_hash": key_hash,
        "key_prefix": key_prefix,
        "created_at": now_iso,
    }

    try:
        supabase = get_client()
        supabase.table("api_keys").insert(record).execute()
    except Exception as err:
        logger.warning(f"Supabase api_keys insert fallback ({err}). Storing in local DB.")

    _LOCAL_API_KEYS_DB[key_hash] = record
    _LOCAL_API_KEYS_DB[key_id] = record

    return ApiKeyResponse(
        id=key_id,
        name=req.name,
        key=raw_key,
        key_prefix=key_prefix,
        created_at=now_iso,
    )


@router.delete("/ci/api-keys/{key_id}")
def delete_api_key(key_id: str):
    try:
        supabase = get_client()
        supabase.table("api_keys").delete().eq("id", key_id).execute()
    except Exception as err:
        logger.warning(f"Supabase api_keys delete fallback ({err})")

    _LOCAL_API_KEYS_DB.pop(key_id, None)
    return {"status": "ok", "message": f"API Key {key_id} revoked."}


@router.post(
    "/ci/scan",
    response_model=CiScanResponse,
    dependencies=[Depends(check_rate_limit)],
)
def run_ci_scan(
    req: CiScanRequest,
    x_opticode_api_key: Optional[str] = Header(None, alias="X-OptiCode-API-Key"),
    authorization: Optional[str] = Header(None),
) -> CiScanResponse:
    key_header = x_opticode_api_key or authorization
    _verify_api_key(key_header)

    if not req.diff_or_files:
        raise HTTPException(status_code=400, detail="No files or diff snippets provided for scanning.")

    markdown_parts: List[str] = [
        "## 🛡️ OptiCode Automated CI Review Summary\n",
        f"**Repository**: `{req.repo or 'Workspace'}` | **Scanned Files**: `{len(req.diff_or_files)}`\n",
        "---\n",
    ]

    scan_results: List[Dict[str, Any]] = []

    for item in req.diff_or_files:
        fname = item.filename or "snippet.code"
        code = item.code
        lang = item.language or "auto"

        file_result: Dict[str, Any] = {"filename": fname, "analyses": {}}
        markdown_parts.append(f"### 📄 `{fname}`\n")

        if "security" in req.analysis_types:
            try:
                sec_res, detected_lang = llm.security_audit(code, lang)
                file_result["analyses"]["security"] = sec_res
                grade = sec_res.get("grade", "A")
                score = sec_res.get("score", 100)
                summary = sec_res.get("summary", "No security issues detected.")
                markdown_parts.append(f"- **Security Grade**: `{grade}` ({score}/100)")
                markdown_parts.append(f"- **Security Summary**: {summary}\n")

                vulns = sec_res.get("vulnerabilities", [])
                if vulns:
                    markdown_parts.append("| Severity | Category | Title | Recommendation |")
                    markdown_parts.append("| :--- | :--- | :--- | :--- |")
                    for v in vulns:
                        sev = v.get("severity", "MEDIUM")
                        cat = v.get("category", "General")
                        title = v.get("title", "")
                        rec = v.get("recommendation", "")
                        markdown_parts.append(f"| **{sev}** | {cat} | {title} | {rec} |")
                    markdown_parts.append("")
            except Exception as err:
                logger.error(f"CI Security scan failed for {fname}: {err}")

        if "explain" in req.analysis_types or "pr-review" in req.analysis_types:
            try:
                exp_text, detected_lang, _ = llm.explain(code, lang, depth="intermediate")
                file_result["analyses"]["explain"] = exp_text
                markdown_parts.append("<details><summary>🔍 Code Explanation & Architecture Walkthrough</summary>\n")
                markdown_parts.append(f"\n{exp_text}\n")
                markdown_parts.append("</details>\n")
            except Exception as err:
                logger.error(f"CI Explain scan failed for {fname}: {err}")

        scan_results.append(file_result)

    markdown_parts.append("\n---\n*Powered by [OptiCode](https://opticode.app) — Async Code Review & Security Layer*")

    return CiScanResponse(
        github_comment_markdown="\n".join(markdown_parts),
        scan_results=scan_results,
    )
