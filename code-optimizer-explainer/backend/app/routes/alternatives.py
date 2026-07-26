import asyncio
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.llm_interface import client as llm
from app.models import AlternativeItem, AlternativesResponse, CodeRequest
from app.rate_limiter import check_llm_rate_limit
from app.cache import cache

logger = logging.getLogger("code_optimizer.routes.alternatives")
router = APIRouter()

MAX_CHARS = 20000


@router.post("/alternatives", response_model=AlternativesResponse, dependencies=[Depends(check_llm_rate_limit)])
def get_alternatives(request: CodeRequest) -> AlternativesResponse:
    if len(request.code) > MAX_CHARS:
        raise HTTPException(status_code=400, detail=f"Input exceeds {MAX_CHARS} characters.")

    cached = cache.get("alternatives", request.code, request.language, None)
    if cached:
        logger.info("Cache hit for alternatives")
        return AlternativesResponse(**cached)

    try:
        alts_raw, detected_lang = llm.alternatives(request.code, request.language)
        alts = [AlternativeItem(**item) for item in alts_raw]
        result = AlternativesResponse(alternatives=alts, detected_language=detected_lang)
        cache.set("alternatives", request.code, request.language, None, result.model_dump())
        return result
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error in alternatives: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate alternatives.") from err


@router.post("/alternatives/stream", dependencies=[Depends(check_llm_rate_limit)])
async def get_alternatives_stream(request: CodeRequest) -> StreamingResponse:
    """SSE streaming endpoint — streams alternatives as a single JSON chunk."""
    if len(request.code) > MAX_CHARS:
        raise HTTPException(status_code=400, detail=f"Input exceeds {MAX_CHARS} characters.")

    async def generate():
        try:
            alts_raw, detected_lang = llm.alternatives(request.code, request.language)
            payload = json.dumps({"alternatives": alts_raw, "detected_language": detected_lang})
            yield f"data: {json.dumps({'chunk': payload})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as err:
            yield f"data: {json.dumps({'error': str(err)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
