import logging
import os
import sys
from dotenv import load_dotenv

# Ensure backend root directory is in sys.path for Vercel/Render serverless execution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# ✅ SECURITY FIX: Setup sanitized logging BEFORE any imports that use logger
from app.security.logging_config import setup_sanitized_logging
setup_sanitized_logging()

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

cors_origins_env = os.getenv("CORS_ORIGINS", "").strip()
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://opticode-lake.vercel.app",
    "https://opticode-frontend.vercel.app",
    "https://opticode-backend.vercel.app",
]

configured_origins = [
    o.rstrip("/") for o in cors_origins_env.split(",") if o.strip() and o != "*"
] if cors_origins_env else []

origins = list(set(default_origins + configured_origins))

def is_origin_allowed(origin: str | None) -> bool:
    if not origin:
        return False
    clean_origin = origin.rstrip("/")
    if cors_origins_env == "*" or "*" in configured_origins:
        return True
    if clean_origin in origins:
        return True
    if clean_origin.endswith(".vercel.app") or "localhost" in clean_origin or "127.0.0.1" in clean_origin:
        return True
    return False

# ✅ Dynamic CORS handling for all Vercel deployments & configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
)

# Observability middleware — must be registered AFTER CORS so it wraps all routes.
from app.observability import observability_middleware
app.middleware("http")(observability_middleware)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    origin = request.headers.get("origin")
    
    if request.method == "OPTIONS":
        response_origin = origin if (origin and is_origin_allowed(origin)) else ""
        headers = {
            "X-Content-Type-Options": "nosniff",
        }
        if response_origin:
            headers["Access-Control-Allow-Origin"] = response_origin
            headers["Access-Control-Allow-Credentials"] = "true"
            headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, X-CSRF-Token"
        return Response(status_code=200, headers=headers)

    response = await call_next(request)
    
    # Only set CORS headers if origin is in whitelist or allowed
    if origin and is_origin_allowed(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"

    # ✅ SECURITY FIX: Comprehensive security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Content Security Policy - strict, allow only necessary sources
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        "connect-src 'self' https://api.groq.com https://generativelanguage.googleapis.com https://openrouter.ai; "
        "frame-ancestors 'none'; "
        "form-action 'self'"
    )
    
    # Permissions Policy - disable unnecessary features
    response.headers["Permissions-Policy"] = (
        "accelerometer=(), "
        "camera=(), "
        "geolocation=(), "
        "gyroscope=(), "
        "magnetometer=(), "
        "microphone=(), "
        "payment=(), "
        "usb=()"
    )
    
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


@app.get("/metrics", tags=["Monitoring"])
def get_metrics() -> dict:
    """
    Returns aggregate in-process observability metrics.

    Shape:
      {
        "requests": {"total": N, "errors": N, "avg_latency_ms": N},
        "endpoints": {"<path>": {"requests": N, "errors": N, "avg_latency_ms": N}},
        "languages": {"python": N, ...},
        "llm": {"total_retries": N, "validation_failures": N},
        "streaming": {"disconnects": N, "errors": N}
      }
    """
    from app.observability import metrics
    return metrics.snapshot()
