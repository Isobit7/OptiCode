import logging
from fastapi import APIRouter, Depends, HTTPException, Request

from app.llm_interface import client as llm
from app.models import AlternativeItem, AlternativesResponse, CodeRequest, MAX_LINES
from app.rate_limiter import check_rate_limit

logger = logging.getLogger("code_optimizer.routes.alternatives")
router = APIRouter()


@router.post(
    "/alternatives",
    response_model=AlternativesResponse,
    dependencies=[Depends(check_rate_limit)],
)
def get_alternatives(request: CodeRequest) -> AlternativesResponse:
    if request.line_count() > MAX_LINES:
        raise HTTPException(
            status_code=400,
            detail=f"Input code exceeds maximum allowed limit of {MAX_LINES} lines.",
        )

    try:
        alts_raw, detected_lang = llm.alternatives(request.code, request.language)
        alts_formatted = [AlternativeItem(**item) for item in alts_raw]
        return AlternativesResponse(
            alternatives=alts_formatted, detected_language=detected_lang
        )
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error processing alternatives request: {err}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to generate code alternatives."
        ) from err
