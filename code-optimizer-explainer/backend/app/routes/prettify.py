import logging
from fastapi import APIRouter, HTTPException

from app.deterministic_tools import tools
from app.models import CodeRequest, MAX_LINES, PrettifyResponse

logger = logging.getLogger("code_optimizer.routes.prettify")
router = APIRouter()


@router.post("/prettify", response_model=PrettifyResponse)
def prettify_code(request: CodeRequest) -> PrettifyResponse:
    if request.line_count() > MAX_LINES:
        raise HTTPException(
            status_code=400,
            detail=f"Input code exceeds maximum allowed limit of {MAX_LINES} lines.",
        )

    try:
        formatted = tools.prettify(request.code, request.language)
        return PrettifyResponse(formatted_code=formatted)
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error processing prettify request: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to format code.") from err
