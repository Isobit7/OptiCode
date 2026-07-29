import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.llm_interface import client as llm
from app.models import HumanizeRequest, HumanizeResponse
from app.rate_limiter import check_llm_rate_limit
from app.cache import cache
from app.sse import chunk_event, error_event, done_event

logger = logging.getLogger("code_optimizer.routes.humanize")
router = APIRouter()

MAX_CHARS = 20000

# Shared thread-pool for off-loading blocking LLM calls from the async event loop.
_EXECUTOR = ThreadPoolExecutor(max_workers=20, thread_name_prefix="humanize-stream")


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
async def humanize_code_stream(request: HumanizeRequest, http_request: Request) -> StreamingResponse:
    """SSE streaming endpoint — streams humanized code word-by-word.

    Contract (see app/sse.py):
      - Each word is a 'chunk' event with type/chunk/detected_language fields.
      - Errors are 'error' events with type/error/code fields.
      - Stream always ends with the [DONE] sentinel.
      - If the client disconnects, the LLM call is cancelled and the generator exits.
    """
    if len(request.code) > MAX_CHARS:
        raise HTTPException(status_code=400, detail=f"Input exceeds {MAX_CHARS} characters.")

    async def generate():
        loop = asyncio.get_event_loop()
        try:
            humanized_code, detected_lang, mode_used = await loop.run_in_executor(
                _EXECUTOR,
                lambda: llm.humanize(request.code, request.language, request.mode),
            )
        except asyncio.CancelledError:
            logger.info("[humanize/stream] Client disconnected before LLM completed.")
            return
        except Exception as err:
            logger.error(f"[humanize/stream] LLM error: {err}")
            yield error_event(str(err), code="LLM_ERROR")
            yield done_event()
            return

        words = humanized_code.split(" ")
        metadata = {"mode_used": mode_used}
        for i, word in enumerate(words):
            if await http_request.is_disconnected():
                logger.info("[humanize/stream] Client disconnected mid-stream.")
                return
            text = word + (" " if i < len(words) - 1 else "")
            yield chunk_event(
                text,
                detected_language=detected_lang,
                metadata=metadata if i == 0 else None,
            )
            await asyncio.sleep(0.008)

        yield done_event()

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
