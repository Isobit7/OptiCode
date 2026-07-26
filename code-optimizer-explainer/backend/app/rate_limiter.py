import os
import time
from collections import defaultdict
from typing import Dict, List

from fastapi import HTTPException, Request

RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "20"))
LLM_RATE_LIMIT_PER_MINUTE = int(os.getenv("LLM_RATE_LIMIT_PER_MINUTE", "10"))
_request_history: Dict[str, List[float]] = defaultdict(list)
_llm_request_history: Dict[str, List[float]] = defaultdict(list)


def check_rate_limit(request: Request) -> None:
    """General rate limiter: 20 req/min per IP for all routes."""
    if os.getenv("TESTING") == "1":
        return
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    cutoff = now - 60.0
    timestamps = [t for t in _request_history[ip] if t > cutoff]
    _request_history[ip] = timestamps
    if len(timestamps) >= RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {RATE_LIMIT_PER_MINUTE} requests per minute.",
        )
    _request_history[ip].append(now)


def check_llm_rate_limit(request: Request) -> None:
    """Tighter rate limiter for LLM-powered routes: 10 req/min per IP."""
    if os.getenv("TESTING") == "1":
        return
    check_rate_limit(request)
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    cutoff = now - 60.0
    timestamps = [t for t in _llm_request_history[ip] if t > cutoff]
    _llm_request_history[ip] = timestamps
    if len(timestamps) >= LLM_RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail=f"AI rate limit exceeded. Maximum {LLM_RATE_LIMIT_PER_MINUTE} AI requests per minute.",
        )
    _llm_request_history[ip].append(now)
