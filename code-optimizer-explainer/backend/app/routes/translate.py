import logging
from fastapi import APIRouter, Depends, HTTPException

from app.cache import cache
from app.llm_interface import client as llm
from app.models import TranslateRequest, TranslateResponse
from app.rate_limiter import check_llm_rate_limit

logger = logging.getLogger("code_optimizer.routes.translate")
router = APIRouter()

MAX_CHARS = 20000


@router.post(
    "/translate",
    response_model=TranslateResponse,
    dependencies=[Depends(check_llm_rate_limit)],
)
def translate_code(request: TranslateRequest) -> TranslateResponse:
    if len(request.code) > MAX_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Input exceeds maximum allowed limit of {MAX_CHARS} characters.",
        )

    cached = cache.get(
        "translate",
        request.code,
        request.language,
        {"target": request.target_language},
    )
    if cached:
        logger.info("Cache hit for translate")
        return TranslateResponse(**cached)

    try:
        translated, notes, src_lang = llm.translate(
            request.code, request.language, request.target_language
        )
        result = TranslateResponse(
            translated_code=translated,
            source_language=src_lang,
            target_language=request.target_language,
            notes=notes,
        )
        cache.set(
            "translate",
            request.code,
            request.language,
            {"target": request.target_language},
            result.model_dump(),
        )
        return result
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error in translate: {err}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to translate code."
        ) from err
