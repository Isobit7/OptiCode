import logging
from fastapi import APIRouter, Depends, HTTPException, Request

from app.deterministic_tools import tools
from app.models import CodeRequest, SeoOptimizeResponse
from app.rate_limiter import check_rate_limit
from app.cache import cache

logger = logging.getLogger("code_optimizer.routes.seo")
router = APIRouter()

MAX_CHARS = 20000


@router.post("/seo-optimize", response_model=SeoOptimizeResponse, dependencies=[Depends(check_rate_limit)])
def seo_optimize_code(request: CodeRequest) -> SeoOptimizeResponse:
    if len(request.code) > MAX_CHARS:
        raise HTTPException(status_code=400, detail=f"Input exceeds {MAX_CHARS} characters.")

    cached = cache.get("seo-optimize", request.code, None, None)
    if cached:
        return SeoOptimizeResponse(**cached)

    try:
        optimized_code, suggestions, score, checklist = tools.seo_optimize(request.code)
        result = SeoOptimizeResponse(
            score=score,
            optimized_code=optimized_code,
            suggestions=suggestions,
            checklist=checklist,
        )
        cache.set("seo-optimize", request.code, None, None, result.model_dump())
        return result
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error in seo-optimize: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to perform SEO analysis.") from err
