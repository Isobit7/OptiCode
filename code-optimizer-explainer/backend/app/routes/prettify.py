import logging
from fastapi import APIRouter, Depends, HTTPException

from app.deterministic_tools import tools
from app.models import CodeRequest, PrettifyResponse
from app.rate_limiter import check_rate_limit
from app.cache import cache

logger = logging.getLogger("code_optimizer.routes.prettify")
router = APIRouter()

MAX_CHARS = 20000


@router.post("/prettify", response_model=PrettifyResponse, dependencies=[Depends(check_rate_limit)])
def prettify_code(request: CodeRequest) -> PrettifyResponse:
    if len(request.code) > MAX_CHARS:
        raise HTTPException(status_code=400, detail=f"Input exceeds {MAX_CHARS} characters.")

    cached = cache.get("prettify", request.code, request.language, None)
    if cached:
        return PrettifyResponse(**cached)

    try:
        from app.llm_interface.client import detect_language
        detected = detect_language(request.code, request.language)
        formatted = tools.prettify(request.code, request.language)
        result = PrettifyResponse(formatted_code=formatted, detected_language=detected)
        cache.set("prettify", request.code, request.language, None, result.model_dump())
        return result
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error in prettify: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to format code.") from err
