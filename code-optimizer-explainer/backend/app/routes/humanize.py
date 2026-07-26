import asyncio
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.llm_interface import client as llm
from app.models import HumanizeRequest, HumanizeResponse
from app.rate_limiter import check_llm_rate_limit
from app.cache import cache

logger = logging.getLogger("code_optimizer.routes.humanize")
router = APIRouter()

MAX_CHARS = 20000


@router.post("/humanize", response_model=HumanizeResponse, dependencies=[Depends(check_llm_rate_limit)])
def humanize_code(request: HumanizeRequest) -> HumanizeResponse:
    if len(request.code) > MAX_CHARS:
        raise HTTPException(status_code=400, detail=f"Input exceeds {MAX_CHARS} characters.")

    cached = cache.get("humanize", request.code, request.language, {"mode": request.mode})
    if cached:
        logger.info("Cache hit for humanize")
        return HumanizeResponse(**cached)

    try:
        humanized_code, detected_lang, mode_used = llm.humanize(request.code, request.language, request.mode)
        result = HumanizeResponse(humanized_code=humanized_code, detected_language=detected_lang, mode_used=mode_used)
        cache.set("humanize", request.code, request.language, {"mode": request.mode}, result.model_dump())
        return result
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error in humanize: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process humanization.") from err


@router.post("/humanize/stream", dependencies=[Depends(check_llm_rate_limit)])
async def humanize_code_stream(request: HumanizeRequest) -> StreamingResponse:
    """SSE streaming endpoint — streams humanized code word-by-word."""
    if len(request.code) > MAX_CHARS:
        raise HTTPException(status_code=400, detail=f"Input exceeds {MAX_CHARS} characters.")

    async def generate():
        try:
            humanized_code, detected_lang, mode_used = llm.humanize(
                request.code, request.language, request.mode
            )
            words = humanized_code.split(" ")
            for i, word in enumerate(words):
                chunk = word + (" " if i < len(words) - 1 else "")
                yield f"data: {json.dumps({'chunk': chunk, 'detected_language': detected_lang})}\n\n"
                await asyncio.sleep(0.008)
            yield "data: [DONE]\n\n"
        except Exception as err:
            yield f"data: {json.dumps({'error': str(err)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
