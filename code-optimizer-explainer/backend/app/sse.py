"""
SSE (Server-Sent Events) contract for OptiCode streaming endpoints.

This module defines the canonical event shapes and serialisation helpers
so the frontend and backend share a single, documented contract.

Event contract
--------------
All events are SSE lines with the format:
  data: <JSON payload>\n\n

Three event types:

1. Chunk event — incremental content fragment
   {
     "type": "chunk",
     "chunk": "<text fragment>",          // the text piece to append
     "detected_language": "<lang>",       // present on every chunk
     "metadata": {                        // optional, present on first chunk only
       "depth_level": "<depth>",
       "mode_used":   "<mode>"
     }
   }

2. Error event — LLM or server error during streaming
   {
     "type": "error",
     "error": "<human-readable message>", // never leaks internal stack traces
     "code":  "<error_code>"              // e.g. "LLM_TIMEOUT", "INPUT_TOO_LARGE"
   }

3. Done event — stream end sentinel (ALWAYS sent, even after an error event)
   {
     "type": "done"
   }
   Wire form: data: [DONE]\n\n  (kept for backward compat with existing FE)

Usage
-----
  from app.sse import chunk_event, error_event, done_event

  async def generate():
      yield chunk_event("hello ", detected_language="python")
      yield chunk_event("world", detected_language="python")
      yield done_event()
"""

import json
from typing import Any, Dict, Optional


_DONE_WIRE = "data: [DONE]\n\n"


def chunk_event(
    text: str,
    detected_language: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> str:
    """Serialise a chunk event to a wire-format SSE string."""
    payload: Dict[str, Any] = {
        "type": "chunk",
        "chunk": text,
        "detected_language": detected_language,
    }
    if metadata:
        payload["metadata"] = metadata
    return f"data: {json.dumps(payload)}\n\n"


def error_event(message: str, code: str = "STREAM_ERROR") -> str:
    """Serialise an error event to a wire-format SSE string."""
    payload = {
        "type": "error",
        "error": message,
        "code": code,
    }
    return f"data: {json.dumps(payload)}\n\n"


def done_event() -> str:
    """Serialise the done sentinel to a wire-format SSE string."""
    return _DONE_WIRE


def parse_sse_line(line: str) -> Optional[Dict[str, Any]]:
    """
    Parse a single SSE 'data: ...' line.

    Returns:
      - {"type": "done"} for the [DONE] sentinel.
      - The parsed JSON dict for structured events.
      - None if the line is not a data line.
    Raises ValueError if the data line is not valid JSON.
    """
    line = line.strip()
    if not line.startswith("data:"):
        return None
    raw = line[len("data:"):].strip()
    if raw == "[DONE]":
        return {"type": "done"}
    return json.loads(raw)
