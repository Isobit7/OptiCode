import logging
from fastapi import APIRouter, HTTPException

from app.deterministic_tools import tools
from app.models import CodeRequest, MAX_LINES, ShortenResponse

logger = logging.getLogger("code_optimizer.routes.shorten")
router = APIRouter()


@router.post("/shorten", response_model=ShortenResponse)
def shorten_code(request: CodeRequest) -> ShortenResponse:
    if request.line_count() > MAX_LINES:
        raise HTTPException(
            status_code=400,
            detail=f"Input code exceeds maximum allowed limit of {MAX_LINES} lines.",
        )

    try:
        shortened = tools.shorten(request.code, request.language)
        return ShortenResponse(shortened_code=shortened)
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error processing shorten request: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to shorten code.") from err
