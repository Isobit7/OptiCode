import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.llm_interface import client as llm
from app.models import MAX_LINES, ExplainRequest, ExplainResponse
from app.rate_limiter import check_llm_rate_limit
from app.cache import cache
from app.sse import chunk_event, error_event, done_event

logger = logging.getLogger("code_optimizer.routes.explain")
router = APIRouter()

MAX_CHARS = 20000

# Shared thread-pool for off-loading blocking LLM calls from the async event loop.
_EXECUTOR = ThreadPoolExecutor(max_workers=20, thread_name_prefix="explain-stream")


@router.post("/explain", response_model=ExplainResponse, dependencies=[Depends(check_llm_rate_limit)])
def explain_code(request: ExplainRequest) -> ExplainResponse:
    if len(request.code) > MAX_CHARS or request.line_count() > MAX_LINES:
        raise HTTPException(
            status_code=400,
            detail=f"Input exceeds maximum allowed limit of {MAX_LINES} lines / {MAX_CHARS} characters.",
        )

    cached = cache.get("explain", request.code, request.language, {"depth": request.depth})
    if cached:
        logger.info("Cache hit for explain")
        return ExplainResponse(**cached)

    try:
        explanation, detected_lang, depth_level = llm.explain(request.code, request.language, request.depth)
        result = ExplainResponse(explanation=explanation, detected_language=detected_lang, depth_level=depth_level)
        cache.set("explain", request.code, request.language, {"depth": request.depth}, result.model_dump())
        return result
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error in explain: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process code explanation.") from err


@router.post("/explain/stream", dependencies=[Depends(check_llm_rate_limit)])
async def explain_code_stream(request: ExplainRequest, http_request: Request) -> StreamingResponse:
    """SSE streaming endpoint — streams explanation word-by-word.

    Contract (see app/sse.py):
      - Each word is a 'chunk' event with type/chunk/detected_language fields.
      - Errors are 'error' events with type/error/code fields.
      - Stream always ends with the [DONE] sentinel.
      - If the client disconnects, the LLM call is cancelled and the generator exits.
    """
    if len(request.code) > MAX_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Input exceeds {MAX_CHARS} characters.",
        )

    async def generate():
        loop = asyncio.get_event_loop()
        try:
            # Run the blocking LLM call in a thread-pool so the async loop stays responsive.
            explanation, detected_lang, depth_level = await loop.run_in_executor(
                _EXECUTOR,
                lambda: llm.explain(request.code, request.language, request.depth),
            )
        except asyncio.CancelledError:
            logger.info("[explain/stream] Client disconnected before LLM completed.")
            return
        except Exception as err:
            logger.error(f"[explain/stream] LLM error: {err}")
            yield error_event(str(err), code="LLM_ERROR")
            yield done_event()
            return

        # Emit first chunk with metadata
        words = explanation.split(" ")
        metadata = {"depth_level": depth_level}
        for i, word in enumerate(words):
            # Abort if the client has already disconnected
            if await http_request.is_disconnected():
                logger.info("[explain/stream] Client disconnected mid-stream.")
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
