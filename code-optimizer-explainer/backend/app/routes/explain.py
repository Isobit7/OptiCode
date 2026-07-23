import logging
from fastapi import APIRouter, Depends, HTTPException, Request

from app.llm_interface import client as llm
from app.models import CodeRequest, ExplainResponse, MAX_LINES
from app.rate_limiter import check_rate_limit

logger = logging.getLogger("code_optimizer.routes.explain")
router = APIRouter()


@router.post(
    "/explain",
    response_model=ExplainResponse,
    dependencies=[Depends(check_rate_limit)],
)
def explain_code(request: CodeRequest) -> ExplainResponse:
    if request.line_count() > MAX_LINES:
        raise HTTPException(
            status_code=400,
            detail=f"Input code exceeds maximum allowed limit of {MAX_LINES} lines.",
        )

    try:
        explanation, detected_lang = llm.explain(request.code, request.language)
        return ExplainResponse(explanation=explanation, detected_language=detected_lang)
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error processing explain request: {err}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to process code explanation."
        ) from err
