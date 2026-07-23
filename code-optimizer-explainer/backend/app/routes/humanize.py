import logging
from fastapi import APIRouter, Depends, HTTPException, Request

from app.llm_interface import client as llm
from app.models import CodeRequest, HumanizeResponse, MAX_LINES
from app.rate_limiter import check_rate_limit

logger = logging.getLogger("code_optimizer.routes.humanize")
router = APIRouter()


@router.post(
    "/humanize",
    response_model=HumanizeResponse,
    dependencies=[Depends(check_rate_limit)],
)
def humanize_code(request: CodeRequest) -> HumanizeResponse:
    if request.line_count() > MAX_LINES:
        raise HTTPException(
            status_code=400,
            detail=f"Input code exceeds maximum allowed limit of {MAX_LINES} lines.",
        )

    try:
        humanized_code, detected_lang = llm.humanize(request.code, request.language)
        return HumanizeResponse(
            humanized_code=humanized_code, detected_language=detected_lang
        )
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error processing humanize request: {err}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to process code humanization."
        ) from err
