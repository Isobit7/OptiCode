"""
Task 6 — Observability tests.

Coverage:
  app/observability.py
    - record_llm_call / record_retry / record_validation populate the bag
    - Bag resets between requests (ContextVar isolation)
    - MetricsStore.snapshot() shape
    - MetricsStore.record() accumulates correctly

  /metrics endpoint
    - Returns 200 with required top-level keys
    - After a request to /api/health, endpoint entry appears
    - total_requests increments after each non-skip request
    - error count increments for 4xx/5xx responses
    - retry / validation_failure counters increment correctly

  Structured log line (format check via caplog)
    - Contains endpoint, method, status, latency_ms fields
"""

import json
import os
import sys
import pytest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["TESTING"] = "1"

from fastapi.testclient import TestClient
from app.main import app
from app.observability import (
    _RequestBag,
    _request_bag,
    _MetricsStore,
    record_llm_call,
    record_retry,
    record_validation,
    record_language,
    metrics,
)

client = TestClient(app)

_PY_CODE = "def add(a, b):\n    return a + b\n"


# ---------------------------------------------------------------------------
# Unit tests for observability helpers
# ---------------------------------------------------------------------------
class TestRequestBag:
    def test_initial_state(self):
        bag = _RequestBag()
        assert bag.detected_language is None
        assert bag.token_estimate == 0
        assert bag.llm_retry_count == 0
        assert bag.validation_passed is None
        assert bag.llm_provider is None

    def test_record_llm_call_sets_provider(self):
        token = _request_bag.set(_RequestBag())
        try:
            record_llm_call("groq/llama", prompt_chars=1000)
            bag = _request_bag.get()
            assert bag.llm_provider == "groq/llama"
            assert bag.token_estimate == 250  # 1000 // 4
        finally:
            _request_bag.reset(token)

    def test_record_llm_call_sets_language(self):
        token = _request_bag.set(_RequestBag())
        try:
            record_llm_call("gemini/flash", prompt_chars=400, detected_language="python")
            assert _request_bag.get().detected_language == "python"
        finally:
            _request_bag.reset(token)

    def test_record_retry_increments(self):
        token = _request_bag.set(_RequestBag())
        try:
            record_retry()
            record_retry()
            assert _request_bag.get().llm_retry_count == 2
        finally:
            _request_bag.reset(token)

    def test_record_validation_pass(self):
        token = _request_bag.set(_RequestBag())
        try:
            record_validation(True)
            assert _request_bag.get().validation_passed is True
        finally:
            _request_bag.reset(token)

    def test_record_validation_fail_overrides_pass(self):
        token = _request_bag.set(_RequestBag())
        try:
            record_validation(True)
            record_validation(False)  # one failure should mark whole request
            assert _request_bag.get().validation_passed is False
        finally:
            _request_bag.reset(token)

    def test_record_validation_pass_does_not_override_fail(self):
        token = _request_bag.set(_RequestBag())
        try:
            record_validation(False)
            record_validation(True)
            assert _request_bag.get().validation_passed is False
        finally:
            _request_bag.reset(token)

    def test_record_language(self):
        token = _request_bag.set(_RequestBag())
        try:
            record_language("typescript")
            assert _request_bag.get().detected_language == "typescript"
        finally:
            _request_bag.reset(token)

    def test_no_bag_in_context_does_not_crash(self):
        """record_* functions must not crash when called outside a request context."""
        # Set ContextVar to None (no active request)
        token = _request_bag.set(None)
        try:
            record_retry()   # Should create a bag lazily and not raise
            record_validation(True)
            record_language("go")
        finally:
            _request_bag.reset(token)


class TestMetricsStore:
    def test_snapshot_has_required_keys(self):
        store = _MetricsStore()
        snap = store.snapshot()
        assert "requests" in snap
        assert "endpoints" in snap
        assert "languages" in snap
        assert "llm" in snap
        assert "streaming" in snap

    def test_requests_keys(self):
        store = _MetricsStore()
        req = store.snapshot()["requests"]
        assert "total" in req
        assert "errors" in req
        assert "avg_latency_ms" in req

    def test_record_increments_total(self):
        store = _MetricsStore()
        bag = _RequestBag()
        store.record("/api/explain", 120.0, 200, bag)
        assert store.snapshot()["requests"]["total"] == 1

    def test_record_error_increments_error_count(self):
        store = _MetricsStore()
        bag = _RequestBag()
        store.record("/api/explain", 50.0, 400, bag)
        assert store.snapshot()["requests"]["errors"] == 1

    def test_record_language_accumulated(self):
        store = _MetricsStore()
        for lang in ["python", "python", "javascript"]:
            bag = _RequestBag()
            bag.detected_language = lang
            store.record("/api/explain", 100.0, 200, bag)
        langs = store.snapshot()["languages"]
        assert langs["python"] == 2
        assert langs["javascript"] == 1

    def test_record_retry_accumulated(self):
        store = _MetricsStore()
        bag = _RequestBag()
        bag.llm_retry_count = 2
        store.record("/api/alternatives", 200.0, 200, bag)
        assert store.snapshot()["llm"]["total_retries"] == 2

    def test_record_validation_failure(self):
        store = _MetricsStore()
        bag = _RequestBag()
        bag.validation_passed = False
        store.record("/api/flowchart", 300.0, 200, bag)
        assert store.snapshot()["llm"]["validation_failures"] == 1

    def test_avg_latency_calculated(self):
        store = _MetricsStore()
        bag = _RequestBag()
        store.record("/api/explain", 100.0, 200, bag)
        store.record("/api/explain", 200.0, 200, bag)
        snap = store.snapshot()
        assert snap["requests"]["avg_latency_ms"] == 150.0

    def test_reset_clears_all(self):
        store = _MetricsStore()
        bag = _RequestBag()
        store.record("/api/explain", 100.0, 200, bag)
        store.reset()
        snap = store.snapshot()
        assert snap["requests"]["total"] == 0


# ---------------------------------------------------------------------------
# /metrics endpoint HTTP tests
# ---------------------------------------------------------------------------
class TestMetricsEndpoint:
    def setup_method(self):
        # Reset the shared metrics store before each test
        metrics.reset()

    def test_metrics_endpoint_returns_200(self):
        resp = client.get("/metrics")
        assert resp.status_code == 200

    def test_metrics_response_has_required_keys(self):
        resp = client.get("/metrics")
        data = resp.json()
        for key in ("requests", "endpoints", "languages", "llm", "streaming"):
            assert key in data, f"Missing key: {key}"

    def test_health_check_not_counted_in_metrics(self):
        """Requests to /health must be excluded from endpoint metrics."""
        before = client.get("/metrics").json()["requests"]["total"]
        client.get("/health")
        after = client.get("/metrics").json()["requests"]["total"]
        # /health hits should not increment (it's in _SKIP_PATHS)
        # The two /metrics calls themselves are also skipped
        assert after == before

    def test_api_request_increments_total(self):
        before = client.get("/metrics").json()["requests"]["total"]
        with patch("app.llm_interface.client.explain", return_value=("### Hi\ntext\n", "python", "beginner")):
            client.post("/api/explain", json={"code": _PY_CODE, "language": "python"})
        after = client.get("/metrics").json()["requests"]["total"]
        assert after == before + 1

    def test_error_request_increments_error_count(self):
        before_err = client.get("/metrics").json()["requests"]["errors"]
        # Send an oversized request to trigger a 400
        client.post("/api/explain", json={"code": "x\n" * 6000, "language": "python"})
        after_err = client.get("/metrics").json()["requests"]["errors"]
        assert after_err == before_err + 1

    def test_endpoint_appears_in_endpoints_dict(self):
        with patch("app.llm_interface.client.explain", return_value=("### Hi\ntext\n", "python", "beginner")):
            client.post("/api/explain", json={"code": _PY_CODE, "language": "python"})
        data = client.get("/metrics").json()
        assert "/api/explain" in data["endpoints"]

    def test_endpoint_stats_have_required_keys(self):
        with patch("app.llm_interface.client.explain", return_value=("### Hi\ntext\n", "python", "beginner")):
            client.post("/api/explain", json={"code": _PY_CODE, "language": "python"})
        ep = client.get("/metrics").json()["endpoints"]["/api/explain"]
        assert "requests" in ep
        assert "errors" in ep
        assert "avg_latency_ms" in ep


# ---------------------------------------------------------------------------
# Structured log line tests
# ---------------------------------------------------------------------------
class TestObservabilityLogLine:
    def test_request_log_line_emitted(self, caplog):
        import logging
        with caplog.at_level(logging.INFO, logger="code_optimizer.observability"):
            with patch(
                "app.llm_interface.client.explain",
                return_value=("### Title\ntext\n", "python", "beginner"),
            ):
                client.post("/api/explain", json={"code": _PY_CODE, "language": "python"})

        log_lines = [r.message for r in caplog.records if r.name == "code_optimizer.observability"]
        assert len(log_lines) >= 1, "Expected at least one observability log line"
        line = log_lines[-1]
        assert "endpoint=" in line
        assert "status=" in line
        assert "latency_ms=" in line

    def test_log_line_contains_method(self, caplog):
        import logging
        with caplog.at_level(logging.INFO, logger="code_optimizer.observability"):
            with patch(
                "app.llm_interface.client.explain",
                return_value=("### Title\ntext\n", "python", "beginner"),
            ):
                client.post("/api/explain", json={"code": _PY_CODE, "language": "python"})
        lines = [r.message for r in caplog.records if r.name == "code_optimizer.observability"]
        assert any("method=POST" in l for l in lines)

    def test_skip_paths_not_logged(self, caplog):
        import logging
        with caplog.at_level(logging.INFO, logger="code_optimizer.observability"):
            client.get("/health")
        lines = [r.message for r in caplog.records if r.name == "code_optimizer.observability"]
        # /health should produce no observability log entries
        health_lines = [l for l in lines if "/health" in l]
        assert len(health_lines) == 0
