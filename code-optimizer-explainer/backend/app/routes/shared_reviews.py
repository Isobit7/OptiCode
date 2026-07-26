import datetime
import logging
import uuid
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.db.supabase_client import get_client
from app.rate_limiter import check_rate_limit

logger = logging.getLogger("code_optimizer.routes.shared_reviews")
router = APIRouter()

# In-memory resilient fallback for shared reviews if Supabase is offline
_LOCAL_SHARED_REVIEWS_DB: Dict[str, Dict[str, Any]] = {}


class ShareReviewRequest(BaseModel):
    input_code: str = Field(..., description="Original submitted code snippet.")
    language: Optional[str] = Field(None, description="Programming language name.")
    analysis_type: str = Field(..., description="Feature type (e.g. security-audit, explain, translate).")
    result_json: Dict[str, Any] = Field(..., description="Full output analysis result payload.")
    visibility: Optional[str] = Field("public", description="Visibility: 'public' or 'unlisted'.")
    expires_in_days: Optional[int] = Field(None, description="Optional expiry duration in days.")


class ShareReviewResponse(BaseModel):
    id: str = Field(..., description="Unique record ID.")
    slug: str = Field(..., description="Short share slug URL key.")
    share_url: str = Field(..., description="Full shareable URL.")
    analysis_type: str = Field(..., description="Analysis feature type.")
    visibility: str = Field("public", description="Visibility mode.")
    created_at: str = Field(..., description="Creation ISO timestamp.")
    expires_at: Optional[str] = Field(None, description="Expiration timestamp.")


class SharedReviewDetailResponse(BaseModel):
    id: str
    slug: str
    input_code: str
    language: Optional[str] = None
    analysis_type: str
    result_json: Dict[str, Any]
    visibility: str
    created_at: str
    expires_at: Optional[str] = None


@router.post(
    "/shared-reviews",
    response_model=ShareReviewResponse,
    dependencies=[Depends(check_rate_limit)],
)
def create_shared_review(req: ShareReviewRequest, request: Request) -> ShareReviewResponse:
    if not req.input_code.strip():
        raise HTTPException(status_code=400, detail="Input code cannot be empty.")

    now = datetime.datetime.now(datetime.timezone.utc)
    record_id = str(uuid.uuid4())
    slug = record_id.replace("-", "")[:10]  # Clean 10-char short slug

    expires_at_iso: Optional[str] = None
    if req.expires_in_days and req.expires_in_days > 0:
        exp_time = now + datetime.timedelta(days=req.expires_in_days)
        expires_at_iso = exp_time.isoformat()

    record = {
        "id": record_id,
        "slug": slug,
        "input_code": req.input_code,
        "language": req.language or "auto",
        "analysis_type": req.analysis_type,
        "result_json": req.result_json,
        "visibility": req.visibility or "public",
        "created_at": now.isoformat(),
        "expires_at": expires_at_iso,
    }

    # Attempt Supabase insert with graceful local fallback
    try:
        supabase = get_client()
        res = supabase.table("shared_reviews").insert(record).execute()
        if hasattr(res, "data") and res.data and len(res.data) > 0:
            db_row = res.data[0]
            slug = db_row.get("slug", slug)
    except Exception as err:
        logger.warning(
            f"Supabase shared_reviews insert fallback ({err}). Saving to in-memory store."
        )

    _LOCAL_SHARED_REVIEWS_DB[slug] = record
    _LOCAL_SHARED_REVIEWS_DB[record_id] = record

    base_url = str(request.base_url).rstrip("/")
    share_url = f"{base_url}/share/{slug}"

    return ShareReviewResponse(
        id=record_id,
        slug=slug,
        share_url=share_url,
        analysis_type=req.analysis_type,
        visibility=req.visibility or "public",
        created_at=now.isoformat(),
        expires_at=expires_at_iso,
    )


@router.get("/shared-reviews/{slug}", response_model=SharedReviewDetailResponse)
def get_shared_review(slug: str) -> SharedReviewDetailResponse:
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    record: Optional[Dict[str, Any]] = None

    # Attempt Supabase query
    try:
        supabase = get_client()
        res = (
            supabase.table("shared_reviews")
            .select("*")
            .eq("slug", slug)
            .execute()
        )
        if hasattr(res, "data") and res.data and len(res.data) > 0:
            record = res.data[0]
    except Exception as err:
        logger.debug(f"Supabase shared_reviews query fallback ({err})")

    # Local fallback if not found in Supabase
    if not record:
        record = _LOCAL_SHARED_REVIEWS_DB.get(slug)

    if not record:
        raise HTTPException(status_code=404, detail="Shared review link not found or has expired.")

    # Expiry check
    if record.get("expires_at") and record["expires_at"] < now_iso:
        raise HTTPException(status_code=404, detail="This shared review link has expired.")

    return SharedReviewDetailResponse(
        id=record["id"],
        slug=record["slug"],
        input_code=record["input_code"],
        language=record.get("language"),
        analysis_type=record["analysis_type"],
        result_json=record["result_json"],
        visibility=record.get("visibility", "public"),
        created_at=record["created_at"],
        expires_at=record.get("expires_at"),
    )
