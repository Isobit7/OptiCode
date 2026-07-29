"""
Task 7 — Full integration test matrix for all 13 endpoints.

Tests four categories per endpoint (from the plan):
  Happy path   — valid input → correct, schema-conformant output
  Edge input   — empty, huge, minified, non-code, wrong-language-tag
  Failure mode — LLM timeout, malformed LLM output, provider error
  Regression   — response shape and required fields are stable

LLM calls are patched so no API keys are required.

Endpoints covered (13):
  /api/explain             /api/explain/stream
  /api/humanize            /api/humanize/stream
  /api/prettify            /api/shorten
  /api/seo-optimize        /api/alternatives
  /api/security-audit      /api/translate
  /api/pr-review           /api/diff-story
  /api/flowchart
"""
import json, os, sys
from unittest.mock import patch
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["TESTING"] = "1"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

_PY    = "def add(a, b):\n    return a + b\n"
_JS    = "function add(a, b) { return a + b; }\nmodule.exports = add;\n"
_HTML  = (
    '<!DOCTYPE html><html lang="en"><head>'
    '<title>T</title><meta name="description" content="d"/>'
    '<meta name="viewport" content="width=device-width"/>'
    '</head><body><main><h1>H</h1></main></body></html>'
)
_HUGE  = "x = 1\n" * 4000   # > MAX_CHARS for LLM endpoints

def _llm(text="### Title\ncontent\n", lang="python", extra=None):
    """Default mock LLM returning well-formed explain output."""
    return patch("app.llm_interface.client._call_model", return_value=(text, "mock/model"))


# ============================================================
# /api/explain
# ============================================================
class TestExplain:
    def test_happy_path(self):
        with _llm():
            r = client.post("/api/explain", json={"code": _PY, "language": "python"})
        assert r.status_code == 200
        d = r.json()
        assert "explanation" in d
        assert d["detected_language"] == "python"
        assert d["depth_level"] == "beginner"

    def test_all_depth_levels(self):
        for depth in ("beginner", "intermediate", "advanced"):
            with _llm():
                r = client.post("/api/explain", json={"code": _PY, "language": "python", "depth": depth})
            assert r.status_code == 200
            assert r.json()["depth_level"] == depth

    def test_edge_empty_code_still_returns_200(self):
        with _llm():
            r = client.post("/api/explain", json={"code": "", "language": "python"})
        assert r.status_code == 200

    def test_edge_oversized_input_returns_400(self):
        r = client.post("/api/explain", json={"code": _HUGE, "language": "python"})
        assert r.status_code == 400
        assert "exceeds" in r.json()["detail"].lower()

    def test_edge_line_limit_exceeded(self):
        long_code = "# line\n" * 5005
        r = client.post("/api/explain", json={"code": long_code, "language": "python"})
        assert r.status_code == 400

    def test_failure_llm_error_returns_200_with_error_message(self):
        with patch("app.llm_interface.client._call_model", side_effect=RuntimeError("timeout")):
            r = client.post("/api/explain", json={"code": _PY, "language": "python"})
        assert r.status_code == 200
        assert "explanation" in r.json()

    def test_regression_response_shape(self):
        with _llm():
            r = client.post("/api/explain", json={"code": _PY, "language": "python"})
        d = r.json()
        for key in ("explanation", "detected_language", "depth_level"):
            assert key in d


# ============================================================
# /api/explain/stream
# ============================================================
class TestExplainStream:
    def test_happy_path_returns_sse(self):
        with patch("app.llm_interface.client.explain", return_value=("### Hi\nword\n", "python", "beginner")):
            r = client.post("/api/explain/stream", json={"code": _PY, "language": "python"})
        assert r.status_code == 200
        assert "text/event-stream" in r.headers["content-type"]
        assert "data: [DONE]" in r.text

    def test_edge_oversized_returns_400(self):
        r = client.post("/api/explain/stream", json={"code": _HUGE, "language": "python"})
        assert r.status_code == 400

    def test_failure_llm_error_produces_error_event_and_done(self):
        with patch("app.llm_interface.client.explain", side_effect=RuntimeError("boom")):
            r = client.post("/api/explain/stream", json={"code": _PY, "language": "python"})
        assert r.status_code == 200
        assert '"type": "error"' in r.text
        assert "data: [DONE]" in r.text


# ============================================================
# /api/humanize
# ============================================================
class TestHumanize:
    def test_happy_path(self):
        with patch("app.llm_interface.client.humanize",
                   return_value=("# done\ndef add(a,b): return a+b\n", "python", "de-ai")):
            r = client.post("/api/humanize", json={"code": _PY, "language": "python"})
        assert r.status_code == 200
        d = r.json()
        assert "humanized_code" in d
        assert d["mode_used"] == "de-ai"

    def test_all_modes(self):
        for mode in ("de-ai", "simplify", "idiomatic"):
            with patch("app.llm_interface.client.humanize",
                       return_value=(f"# {mode}\ndef f(): pass\n", "python", mode)):
                r = client.post("/api/humanize", json={"code": _PY, "language": "python", "mode": mode})
            assert r.status_code == 200
            assert r.json()["mode_used"] == mode

    def test_edge_oversized_returns_400(self):
        r = client.post("/api/humanize", json={"code": _HUGE})
        assert r.status_code == 400

    def test_edge_empty_code_still_returns_200(self):
        with patch("app.llm_interface.client.humanize",
                   return_value=("# empty\n", "python", "de-ai")):
            r = client.post("/api/humanize", json={"code": "", "language": "python"})
        assert r.status_code == 200

    def test_failure_llm_error_returns_200_fallback(self):
        with patch("app.llm_interface.client._call_model", side_effect=RuntimeError("fail")):
            r = client.post("/api/humanize", json={"code": _PY, "language": "python"})
        assert r.status_code == 200

    def test_regression_response_shape(self):
        with patch("app.llm_interface.client.humanize",
                   return_value=("# humanized\ndef f(): pass\n", "python", "de-ai")):
            r = client.post("/api/humanize", json={"code": _PY, "language": "python"})
        d = r.json()
        for key in ("humanized_code", "detected_language", "mode_used"):
            assert key in d


# ============================================================
# /api/humanize/stream
# ============================================================
class TestHumanizeStream:
    def test_happy_path_returns_sse(self):
        with patch("app.llm_interface.client.humanize",
                   return_value=("# human\ndef add(a,b): return a+b\n", "python", "de-ai")):
            r = client.post("/api/humanize/stream", json={"code": _PY, "language": "python"})
        assert r.status_code == 200
        assert "data: [DONE]" in r.text

    def test_failure_llm_error_produces_error_event(self):
        with patch("app.llm_interface.client.humanize", side_effect=RuntimeError("error")):
            r = client.post("/api/humanize/stream", json={"code": _PY, "language": "python"})
        assert '"type": "error"' in r.text
        assert "data: [DONE]" in r.text


# ============================================================
# /api/prettify  (deterministic — no LLM mock needed)
# ============================================================
class TestPrettify:
    def test_happy_python(self):
        r = client.post("/api/prettify", json={"code": "def foo():bar=1;return bar", "language": "python"})
        assert r.status_code == 200
        assert "formatted_code" in r.json()

    def test_happy_javascript(self):
        r = client.post("/api/prettify", json={"code": "function f(){return 1}", "language": "javascript"})
        assert r.status_code == 200
        assert "function" in r.json()["formatted_code"]

    def test_edge_empty_input(self):
        r = client.post("/api/prettify", json={"code": "", "language": "python"})
        assert r.status_code == 200
        assert "formatted_code" in r.json()

    def test_edge_already_formatted(self):
        code = "def foo(x: int) -> int:\n    return x + 1\n"
        r = client.post("/api/prettify", json={"code": code, "language": "python"})
        assert r.status_code == 200

    def test_edge_unknown_language_passthrough(self):
        r = client.post("/api/prettify", json={"code": "PROCEDURE foo IS BEGIN NULL; END;", "language": "plsql"})
        assert r.status_code == 200
        assert "formatted_code" in r.json()

    def test_regression_response_shape(self):
        r = client.post("/api/prettify", json={"code": _PY, "language": "python"})
        assert "formatted_code" in r.json()


# ============================================================
# /api/shorten  (deterministic for Python)
# ============================================================
class TestShorten:
    def test_happy_removes_docstring(self):
        code = 'def foo():\n    """doc"""\n    return 42\n'
        r = client.post("/api/shorten", json={"code": code, "language": "python"})
        assert r.status_code == 200
        assert "doc" not in r.json()["shortened_code"]
        assert "42" in r.json()["shortened_code"]

    def test_edge_empty_input(self):
        r = client.post("/api/shorten", json={"code": "", "language": "python"})
        assert r.status_code == 200

    def test_edge_already_minimal(self):
        r = client.post("/api/shorten", json={"code": "x=1;y=2", "language": "python"})
        assert r.status_code == 200

    def test_regression_response_shape(self):
        r = client.post("/api/shorten", json={"code": _PY, "language": "python"})
        assert "shortened_code" in r.json()


# ============================================================
# /api/seo-optimize  (deterministic)
# ============================================================
class TestSeoOptimize:
    def test_happy_path_perfect_html(self):
        r = client.post("/api/seo-optimize", json={"code": _HTML})
        assert r.status_code == 200
        d = r.json()
        assert d["score"] == 100
        assert "optimized_code" in d
        assert isinstance(d["checklist"], list)

    def test_edge_empty_html(self):
        r = client.post("/api/seo-optimize", json={"code": ""})
        assert r.status_code == 200
        assert "score" in r.json()

    def test_edge_non_html_input_does_not_crash(self):
        r = client.post("/api/seo-optimize", json={"code": _PY})
        assert r.status_code == 200

    def test_edge_already_optimized_html_idempotent(self):
        r1 = client.post("/api/seo-optimize", json={"code": _HTML})
        score1 = r1.json()["score"]
        opt = r1.json()["optimized_code"]
        r2 = client.post("/api/seo-optimize", json={"code": opt})
        assert r2.json()["score"] >= score1

    def test_regression_response_shape(self):
        r = client.post("/api/seo-optimize", json={"code": _HTML})
        d = r.json()
        for k in ("score", "optimized_code", "suggestions", "checklist"):
            assert k in d
        assert 0 <= d["score"] <= 100
        assert isinstance(d["suggestions"], list)
        assert isinstance(d["checklist"], list)


# ============================================================
# /api/alternatives
# ============================================================
_ALTS_JSON = json.dumps([{
    "name": "Functional",
    "code": "result = [x*2 for x in nums]",
    "tradeoff": "Concise",
    "pros": ["readable"],
    "cons": [],
    "time_complexity": "O(N)",
    "space_complexity": "O(N)",
}])

class TestAlternatives:
    def test_happy_path(self):
        with _llm(_ALTS_JSON):
            r = client.post("/api/alternatives", json={"code": _PY, "language": "python"})
        assert r.status_code == 200
        d = r.json()
        assert "alternatives" in d
        assert isinstance(d["alternatives"], list)
        assert len(d["alternatives"]) >= 1

    def test_edge_empty_code(self):
        with _llm(_ALTS_JSON):
            r = client.post("/api/alternatives", json={"code": "", "language": "python"})
        assert r.status_code == 200

    def test_edge_oversized_returns_400(self):
        r = client.post("/api/alternatives", json={"code": _HUGE})
        assert r.status_code == 400

    def test_failure_malformed_llm_output_fallback(self):
        with _llm("not json at all"):
            with _llm("also not json"):
                r = client.post("/api/alternatives", json={"code": _PY, "language": "python"})
        assert r.status_code == 200
        assert isinstance(r.json()["alternatives"], list)

    def test_regression_each_alternative_has_required_fields(self):
        with _llm(_ALTS_JSON):
            r = client.post("/api/alternatives", json={"code": _PY, "language": "python"})
        for alt in r.json()["alternatives"]:
            assert "code" in alt
            assert "tradeoff" in alt
            assert isinstance(alt.get("pros"), list)
            assert isinstance(alt.get("cons"), list)


# ============================================================
# /api/security-audit
# ============================================================
_SEC_JSON = json.dumps({
    "grade": "B", "score": 75,
    "vulnerabilities": [{
        "severity": "MEDIUM", "category": "Input Validation",
        "title": "Unvalidated Input", "description": "Input not validated.",
        "line_number": 1, "recommendation": "Validate inputs."
    }],
    "summary": "One medium issue.",
})

class TestSecurityAudit:
    def test_happy_path(self):
        with _llm(_SEC_JSON):
            r = client.post("/api/security-audit", json={"code": _PY, "language": "python"})
        assert r.status_code == 200
        d = r.json()
        for k in ("grade", "score", "vulnerabilities", "sanitized_code", "summary"):
            assert k in d

    def test_detects_hardcoded_secret(self):
        secret_code = 'API_KEY = "sk-abcdefghijklmnopqrstuvwxyz123456"\n'
        with _llm(_SEC_JSON):
            r = client.post("/api/security-audit", json={"code": secret_code})
        assert r.status_code == 200
        assert r.json()["secrets_found"] >= 1

    def test_secret_capped_score(self):
        secret_code = 'KEY = "sk-abcdefghijklmnopqrstuvwxyz123456"\n'
        high_score = json.dumps({"grade": "A+", "score": 99, "vulnerabilities": [], "summary": "OK"})
        with _llm(high_score):
            r = client.post("/api/security-audit", json={"code": secret_code})
        assert r.json()["score"] <= 50

    def test_edge_empty_code(self):
        with _llm(_SEC_JSON):
            r = client.post("/api/security-audit", json={"code": ""})
        assert r.status_code == 200

    def test_edge_oversized_returns_400(self):
        r = client.post("/api/security-audit", json={"code": _HUGE})
        assert r.status_code == 400

    def test_failure_malformed_llm_falls_back_to_deterministic(self):
        with _llm("not json"):
            with _llm("also not json"):
                r = client.post("/api/security-audit", json={"code": _PY, "language": "python"})
        assert r.status_code == 200
        d = r.json()
        assert "grade" in d

    def test_regression_grade_is_valid(self):
        with _llm(_SEC_JSON):
            r = client.post("/api/security-audit", json={"code": _PY, "language": "python"})
        assert r.json()["grade"] in ("A+", "A", "B", "C", "D", "F")

    def test_regression_score_range(self):
        with _llm(_SEC_JSON):
            r = client.post("/api/security-audit", json={"code": _PY, "language": "python"})
        assert 0 <= r.json()["score"] <= 100


# ============================================================
# /api/translate
# ============================================================
_TRANSLATE_OUT = "```typescript\nfunction add(a: number, b: number): number { return a + b; }\n```\n- Note: Use explicit types\n"

class TestTranslate:
    def test_happy_path(self):
        with _llm(_TRANSLATE_OUT):
            r = client.post("/api/translate", json={
                "code": _PY, "language": "python", "target_language": "TypeScript"
            })
        assert r.status_code == 200
        d = r.json()
        assert "translated_code" in d
        assert d["target_language"] == "TypeScript"
        assert isinstance(d["notes"], list)
        assert len(d["notes"]) > 0

    def test_edge_empty_code(self):
        with _llm(_TRANSLATE_OUT):
            r = client.post("/api/translate", json={"code": "", "language": "python", "target_language": "Go"})
        assert r.status_code == 200

    def test_edge_oversized_returns_400(self):
        r = client.post("/api/translate", json={"code": _HUGE, "target_language": "Go"})
        assert r.status_code == 400

    def test_failure_llm_error_returns_200_fallback(self):
        with patch("app.llm_interface.client._call_model", side_effect=RuntimeError("fail")):
            r = client.post("/api/translate", json={
                "code": _PY, "language": "python", "target_language": "Go"
            })
        assert r.status_code == 200

    def test_regression_response_shape(self):
        with _llm(_TRANSLATE_OUT):
            r = client.post("/api/translate", json={
                "code": _PY, "language": "python", "target_language": "TypeScript"
            })
        d = r.json()
        for k in ("translated_code", "source_language", "target_language", "notes"):
            assert k in d


# ============================================================
# /api/pr-review
# ============================================================
_PR_MD = (
    "## 📌 PR Summary\nAdds logic.\n\n"
    "## ⚠️ Technical Risks & Caveats\n- Check edge cases\n\n"
    "## 🧪 Suggested Test Cases\n- Test happy path\n\n"
    "## 📋 Code Changes Breakdown\n- Added function\n"
)

class TestPrReview:
    def test_happy_path(self):
        with _llm(_PR_MD):
            r = client.post("/api/pr-review", json={"code": _PY, "language": "python", "pr_title": "My PR"})
        assert r.status_code == 200
        d = r.json()
        assert "github_markdown" in d
        assert "summary" in d

    def test_edge_empty_code(self):
        with _llm(_PR_MD):
            r = client.post("/api/pr-review", json={"code": "", "language": "python"})
        assert r.status_code == 200

    def test_edge_oversized_returns_400(self):
        r = client.post("/api/pr-review", json={"code": _HUGE})
        assert r.status_code == 400

    def test_high_risk_code_has_non_empty_risks(self):
        auth_code = "def login(password):\n    token = jwt.decode(password)\n    return token\n"
        with _llm(_PR_MD):
            r = client.post("/api/pr-review", json={"code": auth_code, "language": "python"})
        assert len(r.json()["potential_risks"]) > 0

    def test_failure_llm_error_returns_200_fallback(self):
        with patch("app.llm_interface.client._call_model", side_effect=RuntimeError("fail")):
            r = client.post("/api/pr-review", json={"code": _PY, "language": "python"})
        assert r.status_code == 200

    def test_regression_response_shape(self):
        with _llm(_PR_MD):
            r = client.post("/api/pr-review", json={"code": _PY, "language": "python"})
        d = r.json()
        for k in ("summary", "github_markdown", "potential_risks", "test_suggestions"):
            assert k in d
        assert isinstance(d["potential_risks"], list)
        assert isinstance(d["test_suggestions"], list)


# ============================================================
# /api/diff-story
# ============================================================
_DIFF_JSON = json.dumps({
    "summary": "Added a comment.",
    "key_changes": ["Added comment", "No functional change"],
    "reasoning": "Documentation.",
})

class TestDiffStory:
    def test_happy_path(self):
        before = _PY
        after = "# updated\n" + _PY
        with _llm(_DIFF_JSON):
            r = client.post("/api/diff-story", json={
                "before_code": before, "after_code": after, "language": "python"
            })
        assert r.status_code == 200
        d = r.json()
        assert "summary" in d
        assert "key_changes" in d
        assert "reasoning" in d

    def test_edge_identical_inputs_no_llm(self):
        r = client.post("/api/diff-story", json={
            "before_code": _PY, "after_code": _PY, "language": "python"
        })
        assert r.status_code == 200
        assert "No functional code changes" in r.json()["summary"]

    def test_edge_empty_before_and_after(self):
        with _llm(_DIFF_JSON):
            r = client.post("/api/diff-story", json={
                "before_code": "", "after_code": "x = 1", "language": "python"
            })
        assert r.status_code == 200

    def test_edge_oversized_returns_400(self):
        # diff_story MAX_CHARS is 20000 per side
        big = "x = 1\n" * 4000   # 24000 chars — above 20000
        r2 = client.post("/api/diff-story", json={
            "before_code": big, "after_code": big + "\ny=2\n", "language": "python"
        })
        assert r2.status_code == 400

    def test_failure_llm_error_returns_200_fallback(self):
        with patch("app.llm_interface.client._call_model", side_effect=RuntimeError("fail")):
            r = client.post("/api/diff-story", json={
                "before_code": _PY, "after_code": "# changed\n" + _PY, "language": "python"
            })
        assert r.status_code == 200

    def test_regression_response_shape(self):
        with _llm(_DIFF_JSON):
            r = client.post("/api/diff-story", json={
                "before_code": _PY, "after_code": "# new\n" + _PY, "language": "python"
            })
        d = r.json()
        for k in ("summary", "key_changes", "reasoning", "detected_language"):
            assert k in d
        assert isinstance(d["key_changes"], list)


# ============================================================
# /api/flowchart
# ============================================================
_MERMAID = (
    "```mermaid\ngraph TD\n"
    "  Start([Start]) --> Process[Do work]\n"
    "  Process --> End([Done])\n"
    "```"
)

class TestFlowchart:
    def test_happy_path(self):
        with _llm(_MERMAID):
            r = client.post("/api/flowchart", json={"code": _PY, "language": "python"})
        assert r.status_code == 200
        d = r.json()
        assert "mermaid_code" in d
        assert "graph TD" in d["mermaid_code"]
        assert d["nodes_count"] >= 1

    def test_edge_empty_code(self):
        with _llm(_MERMAID):
            r = client.post("/api/flowchart", json={"code": "", "language": "python"})
        assert r.status_code == 200

    def test_edge_oversized_returns_400(self):
        r = client.post("/api/flowchart", json={"code": _HUGE})
        assert r.status_code == 400

    def test_failure_invalid_mermaid_uses_fallback(self):
        bad = lambda p, system_prompt=None: ("not mermaid", "mock/model")
        with patch("app.llm_interface.client._call_model", side_effect=bad):
            r = client.post("/api/flowchart", json={"code": _PY, "language": "python"})
        assert r.status_code == 200
        assert "graph TD" in r.json()["mermaid_code"]

    def test_failure_llm_error_uses_fallback(self):
        with patch("app.llm_interface.client._call_model", side_effect=RuntimeError("fail")):
            r = client.post("/api/flowchart", json={"code": _PY, "language": "python"})
        assert r.status_code == 200
        assert "graph TD" in r.json()["mermaid_code"]

    def test_regression_response_shape(self):
        with _llm(_MERMAID):
            r = client.post("/api/flowchart", json={"code": _PY, "language": "python"})
        d = r.json()
        for k in ("mermaid_code", "nodes_count", "summary"):
            assert k in d
        assert isinstance(d["nodes_count"], int)
