import logging
from fastapi import APIRouter, Depends, HTTPException

from app.cache import cache
from app.llm_interface import client as llm
from app.models import CodeRequest, SecurityAuditResponse, VulnerabilityItem
from app.rate_limiter import check_llm_rate_limit

logger = logging.getLogger("code_optimizer.routes.security_audit")
router = APIRouter()

MAX_CHARS = 20000


@router.post(
    "/security-audit",
    response_model=SecurityAuditResponse,
    dependencies=[Depends(check_llm_rate_limit)],
)
def audit_code_security(request: CodeRequest) -> SecurityAuditResponse:
    if len(request.code) > MAX_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Input exceeds maximum allowed limit of {MAX_CHARS} characters.",
        )

    cached = cache.get("security-audit", request.code, request.language, None)
    if cached:
        logger.info("Cache hit for security-audit")
        return SecurityAuditResponse(**cached)

    try:
        data, detected_lang = llm.security_audit(request.code, request.language)
        vulns = [VulnerabilityItem(**v) for v in data.get("vulnerabilities", [])]
        result = SecurityAuditResponse(
            grade=data["grade"],
            score=data["score"],
            secrets_found=data["secrets_found"],
            vulnerabilities=vulns,
            sanitized_code=data["sanitized_code"],
            summary=data["summary"],
        )
        cache.set(
            "security-audit",
            request.code,
            request.language,
            None,
            result.model_dump(),
        )
        return result
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error in security-audit: {err}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to complete security audit."
        ) from err
