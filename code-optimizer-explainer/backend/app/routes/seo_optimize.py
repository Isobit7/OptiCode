import logging
from fastapi import APIRouter, HTTPException

from app.deterministic_tools import tools
from app.models import CodeRequest, MAX_LINES, SeoOptimizeResponse

logger = logging.getLogger("code_optimizer.routes.seo")
router = APIRouter()


@router.post("/seo-optimize", response_model=SeoOptimizeResponse)
def seo_optimize_code(request: CodeRequest) -> SeoOptimizeResponse:
    if request.line_count() > MAX_LINES:
        raise HTTPException(
            status_code=400,
            detail=f"Input HTML code exceeds maximum allowed limit of {MAX_LINES} lines.",
        )

    try:
        optimized_code, suggestions = tools.seo_optimize(request.code)
        return SeoOptimizeResponse(
            optimized_code=optimized_code, suggestions=suggestions
        )
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error processing SEO optimization request: {err}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to perform SEO static analysis."
        ) from err
