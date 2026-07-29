"""
Observability module for OptiCode.

Provides:
  1. Per-request context bag (ContextVar) — LLM functions push retry counts,
     token estimates, and validation results into this bag. The middleware
     drains it at request end and records the aggregate.

  2. In-process metrics store (thread-safe counters) — accumulated across all
     requests. Exposed via GET /metrics.

  3. Structured per-request log line emitted by the middleware at response
     time, containing: endpoint, detected_language, http_status, latency_ms,
     token_estimate, llm_retry_count, validation_passed.

Usage — LLM functions record into the bag:
  from app.observability import record_llm_call, record_retry, record_validation

Usage — middleware is registered in main.py:
  from app.observability import observability_middleware
  app.middleware("http")(observability_middleware)

Metrics endpoint:
  GET /metrics  →  {"requests": {...}, "endpoints": {...}, "errors": {...}}
"""

import logging
import time
from collections import defaultdict
from contextvars import ContextVar
from dataclasses import dataclass, field
from threading import Lock
from typing import Any, Dict, Optional

from fastapi import Request
from fastapi.responses import Response

logger = logging.getLogger("code_optimizer.observability")


# ---------------------------------------------------------------------------
# Per-request context bag
# ---------------------------------------------------------------------------

@dataclass
class _RequestBag:
    """Mutable bag populated by LLM functions during a single request."""
    detected_language: Optional[str] = None
    token_estimate: int = 0
    llm_retry_count: int = 0
    validation_passed: Optional[bool] = None   # None = no validation run
    llm_provider: Optional[str] = None
    stream_disconnect: bool = False
    stream_error: bool = False


_request_bag: ContextVar[Optional[_RequestBag]] = ContextVar("_request_bag", default=None)


def _get_bag() -> _RequestBag:
    """Get or lazily create the per-request bag for the current context."""
    bag = _request_bag.get()
    if bag is None:
        bag = _RequestBag()
        _request_bag.set(bag)
    return bag


def record_llm_call(
    provider: str,
    prompt_chars: int,
    detected_language: Optional[str] = None,
) -> None:
    """Called by LLM functions after a successful provider call."""
    bag = _get_bag()
    bag.llm_provider = provider
    bag.token_estimate += max(bag.token_estimate, prompt_chars // 4)
    if detected_language:
        bag.detected_language = detected_language


def record_retry() -> None:
    """Called each time an LLM response fails validation and triggers a retry."""
    _get_bag().llm_retry_count += 1


def record_validation(passed: bool) -> None:
    """Called after server-side output validation (Mermaid parse, JSON schema, etc.)."""
    bag = _get_bag()
    # If called multiple times, a single failure marks the whole request as failed.
    if bag.validation_passed is None:
        bag.validation_passed = passed
    elif not passed:
        bag.validation_passed = False


def record_language(language: str) -> None:
    """Called when language detection completes for the request."""
    bag = _get_bag()
    if not bag.detected_language:
        bag.detected_language = language


# ---------------------------------------------------------------------------
# Aggregate metrics store
# ---------------------------------------------------------------------------

class _MetricsStore:
    """Thread-safe in-process metrics counters."""

    def __init__(self):
        self._lock = Lock()
        self._total_requests: int = 0
        self._total_errors: int = 0
        self._total_latency_ms: float = 0.0
        self._endpoint_counts: Dict[str, int] = defaultdict(int)
        self._endpoint_errors: Dict[str, int] = defaultdict(int)
        self._endpoint_latency_ms: Dict[str, float] = defaultdict(float)
        self._language_counts: Dict[str, int] = defaultdict(int)
        self._retry_total: int = 0
        self._validation_failures: int = 0
        self._stream_disconnects: int = 0
        self._stream_errors: int = 0

    def record(
        self,
        endpoint: str,
        latency_ms: float,
        status_code: int,
        bag: _RequestBag,
    ) -> None:
        with self._lock:
            self._total_requests += 1
            self._total_latency_ms += latency_ms
            self._endpoint_counts[endpoint] += 1
            self._endpoint_latency_ms[endpoint] += latency_ms

            if status_code >= 400:
                self._total_errors += 1
                self._endpoint_errors[endpoint] += 1

            if bag.detected_language:
                self._language_counts[bag.detected_language] += 1

            self._retry_total += bag.llm_retry_count

            if bag.validation_passed is False:
                self._validation_failures += 1

            if bag.stream_disconnect:
                self._stream_disconnects += 1
            if bag.stream_error:
                self._stream_errors += 1

    def snapshot(self) -> Dict[str, Any]:
        with self._lock:
            total = max(self._total_requests, 1)
            avg_latency = round(self._total_latency_ms / total, 1)

            endpoint_stats = {}
            for ep, count in self._endpoint_counts.items():
                ep_avg = round(self._endpoint_latency_ms[ep] / max(count, 1), 1)
                endpoint_stats[ep] = {
                    "requests": count,
                    "errors": self._endpoint_errors.get(ep, 0),
                    "avg_latency_ms": ep_avg,
                }

            return {
                "requests": {
                    "total": self._total_requests,
                    "errors": self._total_errors,
                    "avg_latency_ms": avg_latency,
                },
                "endpoints": endpoint_stats,
                "languages": dict(self._language_counts),
                "llm": {
                    "total_retries": self._retry_total,
                    "validation_failures": self._validation_failures,
                },
                "streaming": {
                    "disconnects": self._stream_disconnects,
                    "errors": self._stream_errors,
                },
            }

    def reset(self) -> None:
        """Reset all counters (used in tests)."""
        with self._lock:
            self.__init__()


metrics = _MetricsStore()


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

# Paths that should not be recorded in per-endpoint metrics.
_SKIP_PATHS = frozenset(["/health", "/", "/docs", "/redoc", "/openapi.json", "/metrics", "/cache/stats"])


async def observability_middleware(request: Request, call_next) -> Response:
    """
    Per-request observability middleware.

    Records:
      - Wall-clock latency (ms)
      - Endpoint path (normalised)
      - HTTP status code
      - Detected language (from request bag if populated by LLM function)
      - Token estimate
      - LLM retry count
      - Validation pass/fail
      - Stream disconnect / error flags

    Emits a single structured INFO log line per non-skipped request.
    Updates the in-process metrics store.
    """
    # Initialise a fresh bag for this request context
    bag = _RequestBag()
    token = _request_bag.set(bag)

    start = time.monotonic()
    try:
        response = await call_next(request)
    except Exception:
        # Let the global exception handler deal with it; record as error.
        _request_bag.reset(token)
        raise
    finally:
        latency_ms = (time.monotonic() - start) * 1000

    path = request.url.path.rstrip("/") or "/"
    if path not in _SKIP_PATHS:
        status = response.status_code

        logger.info(
            "REQUEST endpoint=%s method=%s status=%d latency_ms=%.1f "
            "language=%s token_estimate=%d llm_retries=%d "
            "validation=%s provider=%s",
            path,
            request.method,
            status,
            latency_ms,
            bag.detected_language or "unknown",
            bag.token_estimate,
            bag.llm_retry_count,
            ("pass" if bag.validation_passed is True
             else "fail" if bag.validation_passed is False
             else "n/a"),
            bag.llm_provider or "n/a",
        )

        metrics.record(path, latency_ms, status, bag)

    _request_bag.reset(token)
    return response
