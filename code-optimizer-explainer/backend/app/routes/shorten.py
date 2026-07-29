import logging
from fastapi import APIRouter, Depends, HTTPException

from app.deterministic_tools import tools
from app.models import CodeRequest, ShortenResponse
from app.rate_limiter import check_rate_limit
from app.cache import cache

logger = logging.getLogger("code_optimizer.routes.shorten")
router = APIRouter()

MAX_CHARS = 20000


@router.post("/shorten", response_model=ShortenResponse, dependencies=[Depends(check_rate_limit)])
def shorten_code(request: CodeRequest) -> ShortenResponse:
    if len(request.code) > MAX_CHARS:
        raise HTTPException(status_code=400, detail=f"Input exceeds {MAX_CHARS} characters.")

    cached = cache.get("shorten", request.code, request.language, None)
    if cached:
        return ShortenResponse(**cached)

    try:
        from app.llm_interface.client import detect_language
        detected = detect_language(request.code, request.language)
        shortened = tools.shorten(request.code, request.language)
        result = ShortenResponse(shortened_code=shortened, detected_language=detected)
        cache.set("shorten", request.code, request.language, None, result.model_dump())
        return result
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error in shorten: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to shorten code.") from err
