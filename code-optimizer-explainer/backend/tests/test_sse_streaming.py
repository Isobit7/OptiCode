"""
Phase 4 — SSE streaming contract and failure-mode tests.

Coverage:
  app/sse.py
    - chunk_event shape: type, chunk, detected_language fields
    - chunk_event with metadata on first chunk
    - error_event shape: type, error, code fields
    - done_event wire format
    - parse_sse_line: chunk, error, done, non-data line, malformed JSON

  /api/explain/stream
    - Happy path: valid SSE sequence ending with [DONE]
    - Every event is a valid data: line
    - First chunk carries metadata.depth_level
    - LLM error produces error event + [DONE] sentinel
    - Oversized input returns HTTP 400 (not a broken stream)
    - All chunks have detected_language field

  /api/humanize/stream
    - Happy path: valid SSE sequence ending with [DONE]
    - First chunk carries metadata.mode_used
    - LLM error produces error event + [DONE] sentinel
    - Oversized input returns HTTP 400
    - All chunks have detected_language field

  Disconnect behaviour (unit-level — no actual TCP teardown needed)
    - CancelledError during LLM call stops generator without yielding error event
    - is_disconnected() True mid-stream stops generator immediately
"""

import asyncio
import json
import os
import sys
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["TESTING"] = "1"

from fastapi.testclient import TestClient
from app.main import app
from app.sse import chunk_event, error_event, done_event, parse_sse_line

client = TestClient(app)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
_PY_CODE = "def add(a, b):\n    return a + b\n"

def _mock_explain(return_value=("### Hello\nworld\n", "python", "beginner")):
    return patch("app.llm_interface.client.explain", return_value=return_value)

def _mock_humanize(return_value=("# done\ndef add(a, b):\n    return a + b\n", "python", "de-ai")):
    return patch("app.llm_interface.client.humanize", return_value=return_value)


def _collect_sse_events(response_text: str):
    """Parse all SSE data lines from a streamed response body."""
    events = []
    for line in response_text.splitlines():
        parsed = parse_sse_line(line)
        if parsed is not None:
            events.append(parsed)
    return events


# ---------------------------------------------------------------------------
# app/sse.py — contract helpers
# ---------------------------------------------------------------------------
class TestSseHelpers:
    def test_chunk_event_has_type_field(self):
        raw = chunk_event("hello ", "python")
        parsed = json.loads(raw.replace("data: ", "").strip())
        assert parsed["type"] == "chunk"

    def test_chunk_event_has_chunk_field(self):
        raw = chunk_event("hello ", "python")
        parsed = json.loads(raw.replace("data: ", "").strip())
        assert parsed["chunk"] == "hello "

    def test_chunk_event_has_detected_language(self):
        raw = chunk_event("hello", "typescript")
        parsed = json.loads(raw.replace("data: ", "").strip())
        assert parsed["detected_language"] == "typescript"

    def test_chunk_event_no_metadata_by_default(self):
        raw = chunk_event("x", "python")
        parsed = json.loads(raw.replace("data: ", "").strip())
        assert "metadata" not in parsed

    def test_chunk_event_with_metadata(self):
        raw = chunk_event("x", "python", metadata={"depth_level": "advanced"})
        parsed = json.loads(raw.replace("data: ", "").strip())
        assert parsed["metadata"]["depth_level"] == "advanced"

    def test_error_event_has_type_error(self):
        raw = error_event("timed out", "LLM_TIMEOUT")
        parsed = json.loads(raw.replace("data: ", "").strip())
        assert parsed["type"] == "error"

    def test_error_event_has_error_message(self):
        raw = error_event("timed out")
        parsed = json.loads(raw.replace("data: ", "").strip())
        assert "timed out" in parsed["error"]

    def test_error_event_has_code(self):
        raw = error_event("boom", "MY_CODE")
        parsed = json.loads(raw.replace("data: ", "").strip())
        assert parsed["code"] == "MY_CODE"

    def test_error_event_default_code(self):
        raw = error_event("boom")
        parsed = json.loads(raw.replace("data: ", "").strip())
        assert parsed["code"] == "STREAM_ERROR"

    def test_done_event_wire_format(self):
        assert done_event() == "data: [DONE]\n\n"

    def test_done_event_ends_with_double_newline(self):
        assert done_event().endswith("\n\n")

    def test_all_events_end_with_double_newline(self):
        for ev in [chunk_event("x", "py"), error_event("e"), done_event()]:
            assert ev.endswith("\n\n"), f"Event missing \\n\\n: {ev!r}"

    def test_all_events_start_with_data_prefix(self):
        for ev in [chunk_event("x", "py"), error_event("e"), done_event()]:
            assert ev.startswith("data: "), f"Event missing 'data: ' prefix: {ev!r}"


class TestParseSseLine:
    def test_parse_chunk_event(self):
        payload = json.dumps({"type": "chunk", "chunk": "hello", "detected_language": "python"})
        result = parse_sse_line(f"data: {payload}")
        assert result["type"] == "chunk"
        assert result["chunk"] == "hello"

    def test_parse_done_sentinel(self):
        result = parse_sse_line("data: [DONE]")
        assert result == {"type": "done"}

    def test_parse_error_event(self):
        payload = json.dumps({"type": "error", "error": "timeout", "code": "LLM_TIMEOUT"})
        result = parse_sse_line(f"data: {payload}")
        assert result["type"] == "error"
        assert result["code"] == "LLM_TIMEOUT"

    def test_non_data_line_returns_none(self):
        assert parse_sse_line("event: message") is None
        assert parse_sse_line("id: 123") is None
        assert parse_sse_line("") is None
        assert parse_sse_line(": comment") is None

    def test_malformed_json_raises(self):
        with pytest.raises((json.JSONDecodeError, ValueError)):
            parse_sse_line("data: {not valid json}")

    def test_whitespace_stripped(self):
        payload = json.dumps({"type": "done"})
        result = parse_sse_line(f"  data:  {payload}  ")
        assert result["type"] == "done"


# ---------------------------------------------------------------------------
# /api/explain/stream — happy path
# ---------------------------------------------------------------------------
class TestExplainStream:
    def test_happy_path_returns_200(self):
        with _mock_explain():
            resp = client.post(
                "/api/explain/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        assert resp.status_code == 200

    def test_content_type_is_event_stream(self):
        with _mock_explain():
            resp = client.post(
                "/api/explain/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        assert "text/event-stream" in resp.headers.get("content-type", "")

    def test_stream_ends_with_done_sentinel(self):
        with _mock_explain():
            resp = client.post(
                "/api/explain/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        assert "data: [DONE]" in resp.text

    def test_stream_contains_chunk_events(self):
        with _mock_explain():
            resp = client.post(
                "/api/explain/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        events = _collect_sse_events(resp.text)
        chunk_events = [e for e in events if e.get("type") == "chunk"]
        assert len(chunk_events) > 0

    def test_all_chunk_events_have_detected_language(self):
        with _mock_explain():
            resp = client.post(
                "/api/explain/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        events = _collect_sse_events(resp.text)
        chunks = [e for e in events if e.get("type") == "chunk"]
        for ev in chunks:
            assert "detected_language" in ev, f"Missing detected_language: {ev}"

    def test_first_chunk_has_depth_metadata(self):
        with _mock_explain():
            resp = client.post(
                "/api/explain/stream",
                json={"code": _PY_CODE, "language": "python", "depth": "advanced"},
            )
        events = _collect_sse_events(resp.text)
        chunks = [e for e in events if e.get("type") == "chunk"]
        assert len(chunks) > 0
        first = chunks[0]
        assert "metadata" in first
        assert "depth_level" in first["metadata"]

    def test_done_is_last_event(self):
        with _mock_explain():
            resp = client.post(
                "/api/explain/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        events = _collect_sse_events(resp.text)
        assert events[-1]["type"] == "done"

    def test_oversized_input_returns_400(self):
        big_code = "x = 1\n" * 4000  # >MAX_CHARS
        resp = client.post(
            "/api/explain/stream",
            json={"code": big_code, "language": "python"},
        )
        assert resp.status_code == 400

    def test_depth_levels_all_stream(self):
        for depth in ("beginner", "intermediate", "advanced"):
            with _mock_explain(return_value=(f"### {depth}\ntext\n", "python", depth)):
                resp = client.post(
                    "/api/explain/stream",
                    json={"code": _PY_CODE, "language": "python", "depth": depth},
                )
            assert resp.status_code == 200
            assert "data: [DONE]" in resp.text

    # --- Failure modes ---

    def test_llm_error_produces_error_event(self):
        with patch(
            "app.llm_interface.client.explain",
            side_effect=RuntimeError("LLM provider timeout"),
        ):
            resp = client.post(
                "/api/explain/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        assert resp.status_code == 200
        events = _collect_sse_events(resp.text)
        error_events = [e for e in events if e.get("type") == "error"]
        assert len(error_events) >= 1
        assert "timeout" in error_events[0]["error"].lower() or "provider" in error_events[0]["error"].lower()

    def test_llm_error_stream_still_ends_with_done(self):
        with patch(
            "app.llm_interface.client.explain",
            side_effect=RuntimeError("boom"),
        ):
            resp = client.post(
                "/api/explain/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        assert "data: [DONE]" in resp.text

    def test_error_event_has_code_field(self):
        with patch(
            "app.llm_interface.client.explain",
            side_effect=RuntimeError("provider failed"),
        ):
            resp = client.post(
                "/api/explain/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        events = _collect_sse_events(resp.text)
        error_events = [e for e in events if e.get("type") == "error"]
        assert len(error_events) >= 1
        assert "code" in error_events[0]

    def test_no_internal_traceback_in_error_message(self):
        """Error messages must never expose Python tracebacks to the client."""
        with patch(
            "app.llm_interface.client.explain",
            side_effect=RuntimeError("connection refused"),
        ):
            resp = client.post(
                "/api/explain/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        assert "Traceback" not in resp.text
        assert "File " not in resp.text


# ---------------------------------------------------------------------------
# /api/humanize/stream — happy path + failure modes
# ---------------------------------------------------------------------------
class TestHumanizeStream:
    def test_happy_path_returns_200(self):
        with _mock_humanize():
            resp = client.post(
                "/api/humanize/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        assert resp.status_code == 200

    def test_content_type_is_event_stream(self):
        with _mock_humanize():
            resp = client.post(
                "/api/humanize/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        assert "text/event-stream" in resp.headers.get("content-type", "")

    def test_stream_ends_with_done_sentinel(self):
        with _mock_humanize():
            resp = client.post(
                "/api/humanize/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        assert "data: [DONE]" in resp.text

    def test_stream_contains_chunk_events(self):
        with _mock_humanize():
            resp = client.post(
                "/api/humanize/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        events = _collect_sse_events(resp.text)
        assert any(e.get("type") == "chunk" for e in events)

    def test_all_chunks_have_detected_language(self):
        with _mock_humanize():
            resp = client.post(
                "/api/humanize/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        events = _collect_sse_events(resp.text)
        for ev in [e for e in events if e.get("type") == "chunk"]:
            assert "detected_language" in ev

    def test_first_chunk_has_mode_metadata(self):
        with _mock_humanize():
            resp = client.post(
                "/api/humanize/stream",
                json={"code": _PY_CODE, "language": "python", "mode": "simplify"},
            )
        events = _collect_sse_events(resp.text)
        chunks = [e for e in events if e.get("type") == "chunk"]
        assert len(chunks) > 0
        first = chunks[0]
        assert "metadata" in first
        assert "mode_used" in first["metadata"]

    def test_done_is_last_event(self):
        with _mock_humanize():
            resp = client.post(
                "/api/humanize/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        events = _collect_sse_events(resp.text)
        assert events[-1]["type"] == "done"

    def test_oversized_input_returns_400(self):
        big_code = "x = 1\n" * 4000
        resp = client.post(
            "/api/humanize/stream",
            json={"code": big_code, "language": "python"},
        )
        assert resp.status_code == 400

    def test_llm_error_produces_error_event(self):
        with patch(
            "app.llm_interface.client.humanize",
            side_effect=RuntimeError("rate limit"),
        ):
            resp = client.post(
                "/api/humanize/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        events = _collect_sse_events(resp.text)
        assert any(e.get("type") == "error" for e in events)

    def test_llm_error_stream_still_ends_with_done(self):
        with patch(
            "app.llm_interface.client.humanize",
            side_effect=RuntimeError("network error"),
        ):
            resp = client.post(
                "/api/humanize/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        assert "data: [DONE]" in resp.text

    def test_no_internal_traceback_in_error_message(self):
        with patch(
            "app.llm_interface.client.humanize",
            side_effect=RuntimeError("service unavailable"),
        ):
            resp = client.post(
                "/api/humanize/stream",
                json={"code": _PY_CODE, "language": "python"},
            )
        assert "Traceback" not in resp.text
        assert "File " not in resp.text

    def test_modes_all_stream(self):
        for mode in ("de-ai", "simplify", "idiomatic"):
            with _mock_humanize(return_value=(f"# {mode}\ndef f(): pass\n", "python", mode)):
                resp = client.post(
                    "/api/humanize/stream",
                    json={"code": _PY_CODE, "language": "python", "mode": mode},
                )
            assert resp.status_code == 200
            assert "data: [DONE]" in resp.text


# ---------------------------------------------------------------------------
# Disconnect behaviour — unit-level generator tests
# ---------------------------------------------------------------------------
class TestDisconnectBehaviour:
    """
    Tests for disconnect handling without a real TCP teardown.

    Uses pytest-anyio (bundled with anyio, which is a uvicorn dependency)
    to run async generator tests.
    """

    @pytest.mark.anyio
    async def test_explain_generator_exits_on_cancelled_error(self):
        """When run_in_executor raises CancelledError, generator yields nothing."""
        from app.routes.explain import explain_code_stream
        from app.models import ExplainRequest

        req = ExplainRequest(code=_PY_CODE, language="python", depth="beginner")
        http_req = MagicMock()
        http_req.is_disconnected = AsyncMock(return_value=False)

        # Patch the loop's run_in_executor to raise CancelledError
        mock_loop = MagicMock()
        mock_loop.run_in_executor = AsyncMock(side_effect=asyncio.CancelledError())

        with patch("asyncio.get_event_loop", return_value=mock_loop):
            stream_resp = await explain_code_stream(req, http_req)
            chunks = []
            async for chunk in stream_resp.body_iterator:
                chunks.append(chunk)

        combined = "".join(c.decode() if isinstance(c, bytes) else c for c in chunks)
        # Generator must exit without emitting error or done events
        assert "error" not in combined
        assert "[DONE]" not in combined

    @pytest.mark.anyio
    async def test_explain_generator_stops_on_disconnect_mid_stream(self):
        """When is_disconnected() returns True before any chunk, generator stops early."""
        from app.routes.explain import explain_code_stream
        from app.models import ExplainRequest

        req = ExplainRequest(code=_PY_CODE, language="python", depth="beginner")
        http_req = MagicMock()
        # Disconnect detected on first is_disconnected() call during word loop
        http_req.is_disconnected = AsyncMock(return_value=True)

        explain_output = "### Overview\nword1 word2 word3\n"
        mock_loop = MagicMock()
        mock_loop.run_in_executor = AsyncMock(return_value=(explain_output, "python", "beginner"))

        with patch("asyncio.get_event_loop", return_value=mock_loop):
            stream_resp = await explain_code_stream(req, http_req)
            chunks = []
            async for chunk in stream_resp.body_iterator:
                chunks.append(chunk)

        combined = "".join(c.decode() if isinstance(c, bytes) else c for c in chunks)
        # Disconnected immediately — no chunks should have been emitted
        chunk_events = [line for line in combined.splitlines()
                        if line.startswith("data:") and '"type": "chunk"' in line]
        assert len(chunk_events) == 0

    @pytest.mark.anyio
    async def test_humanize_generator_exits_on_cancelled_error(self):
        """CancelledError during humanize LLM call stops generator silently."""
        from app.routes.humanize import humanize_code_stream
        from app.models import HumanizeRequest

        req = HumanizeRequest(code=_PY_CODE, language="python", mode="de-ai")
        http_req = MagicMock()
        http_req.is_disconnected = AsyncMock(return_value=False)

        mock_loop = MagicMock()
        mock_loop.run_in_executor = AsyncMock(side_effect=asyncio.CancelledError())

        with patch("asyncio.get_event_loop", return_value=mock_loop):
            stream_resp = await humanize_code_stream(req, http_req)
            chunks = []
            async for chunk in stream_resp.body_iterator:
                chunks.append(chunk)

        combined = "".join(c.decode() if isinstance(c, bytes) else c for c in chunks)
        assert "error" not in combined
        assert "[DONE]" not in combined
