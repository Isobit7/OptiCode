"""
Golden-set eval harness — pytest integration.

Runs all 12 representative code snippets through each LLM endpoint's
structural acceptance criteria, with _call_model patched to return
well-formed minimal responses.

This means:
  - Zero LLM API calls — fully offline.
  - Tests the criteria functions themselves for correctness.
  - Tests that the endpoint pipeline (detect_language → prompt build → parse →
    validate) does not crash on any snippet.
  - Acts as a regression baseline: if the pipeline changes break a snippet,
    the corresponding test fails immediately.

Running with real LLM keys:
  python -m eval.run_golden_set --category explain,security
"""

import ast
import json
import os
import sys
import pytest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["TESTING"] = "1"

from eval.fixtures import GOLDEN_SNIPPETS, SNIPPET_BY_ID
from eval.criteria import (
    EvalResult,
    check_explain,
    check_humanize,
    check_alternatives,
    check_security_audit,
    check_translate,
    check_pr_review,
    check_flowchart,
    check_diff_story,
)
from app.llm_interface.client import (
    explain,
    humanize,
    alternatives,
    security_audit,
    translate,
    pr_review,
    flowchart,
)


# ---------------------------------------------------------------------------
# Mock LLM responses — minimal but schema-conformant for each endpoint
# ---------------------------------------------------------------------------

def _explain_mock(prompt: str, system_prompt: str = None) -> tuple:
    return (
        "### What This Code Does\nIt performs the requested operation.\n\n"
        "### Key Logic\n- Step 1: initialise\n- Step 2: execute\n",
        "mock/model",
    )


def _humanize_mock(prompt: str, system_prompt: str = None) -> tuple:
    # Return a slightly different string than the input to pass similarity guard
    return (
        "# Humanized version\ndef fn():\n    # Added helpful comment\n    pass\n",
        "mock/model",
    )


def _alternatives_mock(prompt: str, system_prompt: str = None) -> tuple:
    alts = [
        {
            "name": "Functional Approach",
            "code": "result = list(map(lambda x: x * 2, items))",
            "tradeoff": "More concise but less readable",
            "pros": ["concise", "no loop"],
            "cons": ["less readable"],
            "time_complexity": "O(N)",
            "space_complexity": "O(N)",
        },
        {
            "name": "Generator Approach",
            "code": "result = (x * 2 for x in items)",
            "tradeoff": "Memory efficient for large lists",
            "pros": ["memory efficient"],
            "cons": ["single-use"],
            "time_complexity": "O(N)",
            "space_complexity": "O(1)",
        },
    ]
    return (json.dumps(alts), "mock/model")


def _security_mock(prompt: str, system_prompt: str = None) -> tuple:
    resp = {
        "grade": "B",
        "score": 78,
        "vulnerabilities": [
            {
                "severity": "MEDIUM",
                "category": "Input Validation",
                "title": "Unvalidated Input",
                "description": "User input is not validated before use.",
                "line_number": 1,
                "recommendation": "Validate all inputs.",
            }
        ],
        "summary": "One medium-severity issue found.",
    }
    return (json.dumps(resp), "mock/model")


def _translate_mock(prompt: str, system_prompt: str = None) -> tuple:
    return (
        "```typescript\nfunction translated(): void {\n  // translated body\n}\n```\n"
        "- Note: TypeScript requires explicit type annotations\n"
        "- Note: ESM import syntax differs from Python\n",
        "mock/model",
    )


def _pr_review_mock(prompt: str, system_prompt: str = None) -> tuple:
    return (
        "## 📌 PR Summary\nThis PR adds new functionality.\n\n"
        "## ⚠️ Technical Risks & Caveats\n- Verify edge cases\n- Check auth handling\n\n"
        "## 🧪 Suggested Test Cases\n- Test happy path\n- Test error path\n\n"
        "## 📋 Code Changes Breakdown\n- Added main function\n",
        "mock/model",
    )


def _flowchart_mock(prompt: str, system_prompt: str = None) -> tuple:
    return (
        "```mermaid\ngraph TD\n"
        "  Start([Start]) --> Process[Execute Logic]\n"
        "  Process --> Check{Valid?}\n"
        "  Check -- Yes --> Done([Done])\n"
        "  Check -- No --> Error[Return Error]\n"
        "```",
        "mock/model",
    )


def _diff_story_mock(prompt: str, system_prompt: str = None) -> tuple:
    resp = {
        "summary": "Added a comment at the top of the file.",
        "key_changes": ["Added module-level comment", "No functional changes"],
        "reasoning": "Documentation improvement.",
    }
    return (json.dumps(resp), "mock/model")


# ---------------------------------------------------------------------------
# Parametrize helpers
# ---------------------------------------------------------------------------

SNIPPET_IDS = [s["id"] for s in GOLDEN_SNIPPETS]


def _snippet(sid: str):
    return SNIPPET_BY_ID[sid]


# ---------------------------------------------------------------------------
# explain — 12 snippets × 3 depths = 36 combos, but we test 1 depth per
#           snippet to keep the suite fast. Depth coverage done separately.
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("snippet_id", SNIPPET_IDS)
def test_explain_golden(snippet_id):
    snippet = _snippet(snippet_id)
    snippet_with_depth = dict(snippet, _requested_depth="beginner")
    with patch("app.llm_interface.client._call_model", side_effect=_explain_mock):
        explanation, detected, depth = explain(snippet["code"], snippet["language"], "beginner")
    result = check_explain(explanation, detected, depth, snippet_with_depth)
    assert result.passed, f"[{snippet_id}] explain failed: {result.summary()}"


@pytest.mark.parametrize("depth", ["beginner", "intermediate", "advanced"])
def test_explain_all_depths(depth):
    """Verify all depth levels produce structured output on a reference snippet."""
    snippet = _snippet("py_bst")
    snippet_with_depth = dict(snippet, _requested_depth=depth)
    with patch("app.llm_interface.client._call_model", side_effect=_explain_mock):
        explanation, detected, depth_out = explain(snippet["code"], snippet["language"], depth)
    result = check_explain(explanation, detected, depth_out, snippet_with_depth)
    assert result.passed, f"explain depth={depth} failed: {result.summary()}"


# ---------------------------------------------------------------------------
# humanize
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("snippet_id", SNIPPET_IDS)
def test_humanize_golden(snippet_id):
    snippet = _snippet(snippet_id)
    with patch("app.llm_interface.client._call_model", side_effect=_humanize_mock):
        result_code, detected, mode = humanize(snippet["code"], snippet["language"], "de-ai")
    result = check_humanize(result_code, detected, mode, snippet)
    assert result.passed, f"[{snippet_id}] humanize failed: {result.summary()}"


@pytest.mark.parametrize("mode", ["de-ai", "simplify", "idiomatic"])
def test_humanize_all_modes(mode):
    snippet = _snippet("js_debounce")
    with patch("app.llm_interface.client._call_model", side_effect=_humanize_mock):
        result_code, _, mode_out = humanize(snippet["code"], snippet["language"], mode)
    assert mode_out == mode


# ---------------------------------------------------------------------------
# alternatives
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("snippet_id", SNIPPET_IDS)
def test_alternatives_golden(snippet_id):
    snippet = _snippet(snippet_id)
    with patch("app.llm_interface.client._call_model", side_effect=_alternatives_mock):
        alts, detected = alternatives(snippet["code"], snippet["language"])
    result = check_alternatives(alts, detected, snippet)
    assert result.passed, f"[{snippet_id}] alternatives failed: {result.summary()}"


# ---------------------------------------------------------------------------
# security_audit
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("snippet_id", SNIPPET_IDS)
def test_security_audit_golden(snippet_id):
    snippet = _snippet(snippet_id)
    with patch("app.llm_interface.client._call_model", side_effect=_security_mock):
        result_dict, detected = security_audit(snippet["code"], snippet["language"])
    result = check_security_audit(result_dict, detected, snippet)
    assert result.passed, f"[{snippet_id}] security_audit failed: {result.summary()}"


def test_security_audit_detects_hardcoded_secret():
    """Deterministic secret scanner must fire on the auth snippet."""
    snippet = _snippet("py_auth_jwt")
    # Create a version that does have a hardcoded secret key
    bad_code = snippet["code"].replace(
        "os.getenv('JWT_SECRET_KEY', 'fallback-insecure-key')",
        "'sk-abcdefghijklmnopqrstuvwxyz123456'"
    )
    with patch("app.llm_interface.client._call_model", side_effect=_security_mock):
        result_dict, _ = security_audit(bad_code, "python")
    assert result_dict["secrets_found"] >= 1
    # sanitized_code must differ from bad_code (secret replaced with placeholder)
    assert result_dict["sanitized_code"] != bad_code


def test_security_audit_score_capped_with_secrets():
    snippet = _snippet("py_auth_jwt")
    bad_code = 'API_KEY = "sk-abcdefghijklmnopqrstuvwxyz123456"\n' + snippet["code"]
    high_score_mock = lambda p, system_prompt=None: (
        json.dumps({"grade": "A+", "score": 99, "vulnerabilities": [], "summary": "Clean."}),
        "mock/model",
    )
    with patch("app.llm_interface.client._call_model", side_effect=high_score_mock):
        result_dict, _ = security_audit(bad_code, "python")
    assert result_dict["score"] <= 50


# ---------------------------------------------------------------------------
# translate
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("snippet_id", SNIPPET_IDS)
def test_translate_golden(snippet_id):
    snippet = _snippet(snippet_id)
    with patch("app.llm_interface.client._call_model", side_effect=_translate_mock):
        code_out, notes, src = translate(snippet["code"], snippet["language"], "TypeScript")
    result = check_translate(code_out, notes, src, snippet, "TypeScript")
    assert result.passed, f"[{snippet_id}] translate failed: {result.summary()}"


@pytest.mark.parametrize("src,tgt", [
    ("python", "Go"),
    ("python", "Rust"),
    ("javascript", "Rust"),
    ("python", "TypeScript"),
])
def test_translate_known_pair_injects_caveat(src, tgt):
    """For known pairs, the system prompt sent to LLM must contain the caveat."""
    from eval.fixtures import GOLDEN_SNIPPETS
    snippet = next(s for s in GOLDEN_SNIPPETS if s["language"] == src)
    captured = []

    def capture(prompt, system_prompt=None):
        captured.append(system_prompt or "")
        return _translate_mock(prompt)

    with patch("app.llm_interface.client._call_model", side_effect=capture):
        translate(snippet["code"], src, tgt)

    assert len(captured) >= 1
    # The caveat for this pair must appear in the system prompt
    from app.llm_interface.client import _TRANSLATION_CAVEATS
    pair_key = f"{src.lower()}→{tgt.lower()}"
    if pair_key in _TRANSLATION_CAVEATS:
        # At least some words from the caveat should appear in the prompt
        caveat_words = _TRANSLATION_CAVEATS[pair_key].lower().split()[:3]
        prompt_lower = captured[0].lower()
        assert any(w in prompt_lower for w in caveat_words), (
            f"Caveat words {caveat_words} not found in system prompt for {src}→{tgt}"
        )


# ---------------------------------------------------------------------------
# pr_review
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("snippet_id", SNIPPET_IDS)
def test_pr_review_golden(snippet_id):
    snippet = _snippet(snippet_id)
    with patch("app.llm_interface.client._call_model", side_effect=_pr_review_mock):
        summary, md, risks, tests, detected = pr_review(
            snippet["code"], snippet["language"], pr_title=f"Review: {snippet['id']}"
        )
    result = check_pr_review(summary, md, risks, tests, detected, snippet)
    assert result.passed, f"[{snippet_id}] pr_review failed: {result.summary()}"


@pytest.mark.parametrize("snippet_id", ["py_auth_jwt", "js_auth_middleware", "py_sql_query"])
def test_pr_review_high_risk_has_risks(snippet_id):
    """High-risk snippets must produce a non-empty risk list."""
    snippet = _snippet(snippet_id)
    with patch("app.llm_interface.client._call_model", side_effect=_pr_review_mock):
        _, _, risks, _, _ = pr_review(snippet["code"], snippet["language"])
    assert len(risks) > 0, f"[{snippet_id}] Expected non-empty risks for high-risk snippet"


# ---------------------------------------------------------------------------
# flowchart
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("snippet_id", SNIPPET_IDS)
def test_flowchart_golden(snippet_id):
    snippet = _snippet(snippet_id)
    with patch("app.llm_interface.client._call_model", side_effect=_flowchart_mock):
        mermaid, count, summary_text, detected = flowchart(snippet["code"], snippet["language"])
    result = check_flowchart(mermaid, count, summary_text, detected, snippet)
    assert result.passed, f"[{snippet_id}] flowchart failed: {result.summary()}"


def test_flowchart_invalid_output_uses_fallback():
    """When both LLM attempts return invalid Mermaid, the fallback is used — and it validates."""
    snippet = _snippet("py_utility_sum")
    bad_mermaid = lambda p, system_prompt=None: ("This is not Mermaid at all.", "mock/model")
    with patch("app.llm_interface.client._call_model", side_effect=bad_mermaid):
        mermaid, count, summary_text, detected = flowchart(snippet["code"], snippet["language"])
    # Fallback must always be valid
    assert "graph TD" in mermaid
    assert count >= 1


# ---------------------------------------------------------------------------
# diff_story — uses FastAPI TestClient (no LLM key needed, patched)
# ---------------------------------------------------------------------------

from fastapi.testclient import TestClient
from app.main import app as _app

_client = TestClient(_app)


@pytest.mark.parametrize("snippet_id", SNIPPET_IDS[:6])  # subset to keep suite fast
def test_diff_story_golden(snippet_id):
    snippet = _snippet(snippet_id)
    before = snippet["code"]
    after = "# Refactored\n" + snippet["code"]

    diff_mock = lambda p, system_prompt=None: (
        json.dumps({
            "summary": "Added a comment line at the top.",
            "key_changes": ["Added comment", "No functional change"],
            "reasoning": "Documentation improvement.",
        }),
        "mock/model",
    )

    with patch("app.llm_interface.client._call_model", side_effect=diff_mock):
        resp = _client.post(
            "/api/diff-story",
            json={"before_code": before, "after_code": after, "language": snippet["language"]},
        )
    assert resp.status_code == 200, f"[{snippet_id}] diff_story HTTP {resp.status_code}"
    data = resp.json()
    result = check_diff_story(data, snippet)
    assert result.passed, f"[{snippet_id}] diff_story failed: {result.summary()}"


def test_diff_story_identical_inputs_returns_no_change():
    """Identical before/after must return the 'no functional changes' sentinel."""
    snippet = _snippet("py_utility_sum")
    resp = _client.post(
        "/api/diff-story",
        json={
            "before_code": snippet["code"],
            "after_code": snippet["code"],
            "language": "python",
        },
    )
    assert resp.status_code == 200
    assert "No functional code changes" in resp.json()["summary"]


# ---------------------------------------------------------------------------
# EvalResult helper tests — verify criteria functions themselves
# ---------------------------------------------------------------------------

class TestEvalResultHelper:
    def test_passed_result_is_truthy(self):
        assert bool(EvalResult(passed=True)) is True

    def test_failed_result_is_falsy(self):
        assert bool(EvalResult(passed=False, failures=["x"])) is False

    def test_summary_pass(self):
        assert EvalResult(passed=True).summary() == "PASS"

    def test_summary_fail_includes_reason(self):
        r = EvalResult(passed=False, failures=["Missing heading", "Empty output"])
        assert "Missing heading" in r.summary()
        assert "Empty output" in r.summary()


class TestCriteriaFunctions:
    """Spot-check the criteria functions against known good/bad inputs."""

    def test_check_explain_passes_good_output(self):
        snippet = dict(GOLDEN_SNIPPETS[0], _requested_depth="beginner")
        r = check_explain("### Overview\nSome text\n", "python", "beginner", snippet)
        assert r.passed

    def test_check_explain_fails_no_heading(self):
        snippet = dict(GOLDEN_SNIPPETS[0], _requested_depth="beginner")
        r = check_explain("Just plain text with no headings.", "python", "beginner", snippet)
        assert not r.passed

    def test_check_humanize_fails_on_echo(self):
        snippet = GOLDEN_SNIPPETS[0]
        r = check_humanize(snippet["code"], "python", "de-ai", snippet)
        assert not r.passed

    def test_check_alternatives_fails_empty_list(self):
        r = check_alternatives([], "python", GOLDEN_SNIPPETS[0])
        assert not r.passed

    def test_check_alternatives_fails_no_complexity(self):
        alts = [{"code": "x=1", "tradeoff": "fast", "pros": [], "cons": []}]
        r = check_alternatives(alts, "python", GOLDEN_SNIPPETS[0])
        assert not r.passed

    def test_check_security_audit_fails_bad_grade(self):
        result = {"grade": "X", "score": 80, "vulnerabilities": [], "summary": "ok", "sanitized_code": "x"}
        r = check_security_audit(result, "python", GOLDEN_SNIPPETS[0])
        assert not r.passed

    def test_check_translate_fails_echo(self):
        snippet = GOLDEN_SNIPPETS[0]
        r = check_translate(snippet["code"], ["note"], "python", snippet, "TypeScript")
        assert not r.passed

    def test_check_translate_fails_empty_notes(self):
        snippet = GOLDEN_SNIPPETS[0]
        r = check_translate("translated code", [], "python", snippet, "TypeScript")
        assert not r.passed

    def test_check_pr_review_fails_missing_section(self):
        snippet = GOLDEN_SNIPPETS[0]
        md = "## 📌 PR Summary\nSummary only\n"  # missing 3 sections
        r = check_pr_review("summary", md, [], [], "python", snippet)
        assert not r.passed

    def test_check_flowchart_fails_no_edges(self):
        snippet = GOLDEN_SNIPPETS[0]
        r = check_flowchart("graph TD\n  Start([Start])", 1, "summary", "python", snippet)
        assert not r.passed
