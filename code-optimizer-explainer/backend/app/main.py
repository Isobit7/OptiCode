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

from app.routes import (
    alternatives,
    auth,
    explain,
    history,
    humanize,
    prettify,
    seo_optimize,
    shorten,
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
    return {
        "status": "ok",
        "service": "code-optimizer-explainer-api",
        "model": os.getenv("LLM_MODEL_NAME", "google/gemma-4-31b-it:free"),
    }
