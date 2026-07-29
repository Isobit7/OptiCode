import logging
import os
import sys
from dotenv import load_dotenv

# Ensure backend root directory is in sys.path for Vercel/Render serverless execution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("code_optimizer.main")

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

from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect

cors_origins_env = os.getenv("CORS_ORIGINS", "")
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://opticode-lake.vercel.app",
    "https://opticode-frontend.vercel.app",
    "https://opticode-backend.vercel.app",
]
origins = (
    [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
    if cors_origins_env and cors_origins_env != "*"
    else default_origins
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    origin = request.headers.get("origin")
    
    if request.method == "OPTIONS":
        response_origin = origin if origin else "*"
        headers = {
            "Access-Control-Allow-Origin": response_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
            "X-Content-Type-Options": "nosniff",
        }
        return Response(status_code=200, headers=headers)

    response = await call_next(request)
    if origin and ("vercel.app" in origin or "localhost" in origin or "127.0.0.1" in origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

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
