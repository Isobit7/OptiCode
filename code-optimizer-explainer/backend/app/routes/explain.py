import asyncio
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.llm_interface import client as llm
from app.models import MAX_LINES, ExplainRequest, ExplainResponse
from app.rate_limiter import check_llm_rate_limit
from app.cache import cache

logger = logging.getLogger("code_optimizer.routes.explain")
router = APIRouter()

MAX_CHARS = 20000


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
async def explain_code_stream(request: ExplainRequest) -> StreamingResponse:
    """SSE streaming endpoint — streams explanation word-by-word."""
    if len(request.code) > MAX_CHARS:
        raise HTTPException(status_code=400, detail=f"Input exceeds {MAX_CHARS} characters.")

    async def generate():
        try:
            explanation, detected_lang, depth_level = llm.explain(
                request.code, request.language, request.depth
            )
            words = explanation.split(" ")
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
