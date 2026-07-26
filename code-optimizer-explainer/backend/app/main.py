import logging
import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("code_optimizer.main")

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect

from app.routes import (
    alternatives,
    auth,
    ci,
    diff_story,
    explain,
    flowchart,
    history,
    humanize,
    pr_review,
    prettify,
    security_audit,
    seo_optimize,
    shared_reviews,
    shorten,
    translate,
)

app = FastAPI(
    title="Code Optimizer & Explainer API",
    description="Backend API for AI-powered and deterministic code transformations.",
    version="1.0.0",
)

cors_origins_env = os.getenv("CORS_ORIGINS", "*")
origins = (
    [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
    if cors_origins_env != "*"
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(explain.router, prefix="/api", tags=["Explain"])
app.include_router(humanize.router, prefix="/api", tags=["Humanize"])
app.include_router(alternatives.router, prefix="/api", tags=["Alternatives"])
app.include_router(prettify.router, prefix="/api", tags=["Prettify"])
app.include_router(shorten.router, prefix="/api", tags=["Shorten"])
app.include_router(seo_optimize.router, prefix="/api", tags=["SEO Optimize"])
app.include_router(history.router, prefix="/api", tags=["History"])
app.include_router(security_audit.router, prefix="/api", tags=["Security Audit"])
app.include_router(translate.router, prefix="/api", tags=["Translate"])
app.include_router(pr_review.router, prefix="/api", tags=["PR Review"])
app.include_router(flowchart.router, prefix="/api", tags=["Flowchart"])
app.include_router(shared_reviews.router, prefix="/api", tags=["Shared Reviews"])
app.include_router(ci.router, prefix="/api", tags=["CI Mode"])
app.include_router(diff_story.router, prefix="/api", tags=["Diff Story"])


@app.websocket("/ws/stream")
async def websocket_stream_endpoint(websocket: WebSocket):
    """WebSocket bi-directional real-time streaming endpoint for ultra-low latency actions."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            code = data.get("code", "")
            language = data.get("language")

            if action == "explain":
                from app.llm_interface import client as llm
                explanation, detected, _ = llm.explain(code, language)
                await websocket.send_json({"type": "result", "action": action, "output": explanation, "detected_language": detected})
            elif action == "security-audit":
                from app.llm_interface import client as llm
                res, detected = llm.security_audit(code, language)
                await websocket.send_json({"type": "result", "action": action, "data": res, "detected_language": detected})
            else:
                await websocket.send_json({"type": "error", "message": f"Action '{action}' is not supported over WebSocket stream."})
    except WebSocketDisconnect:
        logger.info("Client disconnected from WebSocket stream.")
    except Exception as err:
        logger.error(f"WebSocket error: {err}")
        await websocket.close()


@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler to present friendly error responses without leaking tracebacks."""
    logger.error(
        f"Unhandled Exception processing request {request.method} {request.url}: {exc}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred while processing your request."
        },
    )


@app.get("/")
@app.get("/health")
def health_check() -> dict:
    from app.cache import cache
    return {
        "status": "ok",
        "service": "code-optimizer-explainer-api",
        "model": os.getenv("LLM_MODEL_NAME", "google/gemma-4-31b-it:free"),
        "cache": cache.stats(),
    }


@app.get("/cache/stats", tags=["Monitoring"])
def get_cache_stats() -> dict:
    """Returns current in-memory cache statistics."""
    from app.cache import cache
    return {"status": "ok", **cache.stats()}
