import os
import time
from collections import defaultdict
from typing import Dict, List

from fastapi import HTTPException, Request

RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "10"))
_request_history: Dict[str, List[float]] = defaultdict(list)


def check_rate_limit(request: Request) -> None:
    """In-memory rate limiter for LLM routes to prevent API cost overruns."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    cutoff = now - 60.0

    # Filter out requests older than 60 seconds
    timestamps = [ts for ts in _request_history[client_ip] if ts > cutoff]
    _request_history[client_ip] = timestamps

    if len(timestamps) >= RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {RATE_LIMIT_PER_MINUTE} AI requests per minute allowed.",
        )

    _request_history[client_ip].append(now)
