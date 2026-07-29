"""
Phase 3 — LLM prompt hardening unit tests.

All LLM calls are patched out with unittest.mock so these tests are fully
deterministic and run without any API keys or network access.

Coverage:
  explain       — heading parse-check, retry on missing headings
  humanize      — similarity guard (echo rejection), Python syntax check
  alternatives  — JSON schema validation, retry on parse failure, Big-O field
  security_audit— required-key validation, severity enum, line_number clamping, retry
  translate     — language-pair caveats injected, notes non-empty fallback
  pr_review     — required-sections check, retry on missing section,
                  high-risk code forces non-empty risk list
"""
import ast
import json
import sys
import os
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["TESTING"] = "1"

from app.llm_interface.client import (
    explain,
    humanize,
    alternatives,
    security_audit,
    translate,
    pr_review,
    _validate_explain_output,
    _validate_alternatives_item,
    _validate_security_response,
    _check_pr_sections,
    _has_high_risk_code,
    _TRANSLATION_CAVEATS,
    _PR_REQUIRED_SECTIONS,
    _SEVERITY_ENUM,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
_SIMPLE_PY = "def add(a, b):\n    return a + b\n"

def _mock_llm(return_value: str):
    """Return a patch context manager that makes _call_model return (return_value, 'mock/model')."""
    return patch(
        "app.llm_interface.client._call_model",
        return_value=(return_value, "mock/model"),
    )


def _mock_llm_sequence(*return_values):
    """Return a patch context manager that makes _call_model return values in sequence."""
    side_effects = [(v, "mock/model") for v in return_values]
    return patch(
        "app.llm_interface.client._call_model",
        side_effect=side_effects,
    )


# ---------------------------------------------------------------------------
# Helpers / pure-function unit tests
# ---------------------------------------------------------------------------
class TestValidateExplainOutput:
    def test_heading_present_returns_true(self):
        assert _validate_explain_output("### What This Code Does\nSome text\n") is True

    def test_h1_heading_returns_true(self):
        assert _validate_explain_output("# Overview\nText here\n") is True

    def test_no_heading_returns_false(self):
        assert _validate_explain_output("Just a plain paragraph with no headings.") is False

    def test_empty_string_returns_false(self):
        assert _validate_explain_output("") is False

    def test_heading_must_have_content(self):
        assert _validate_explain_output("###\n") is False  # empty heading word
        assert _validate_explain_output("### Overview\n") is True


class TestValidateAlternativesItem:
    def test_valid_item_returns_true(self):
        item = {"code": "x = 1", "tradeoff": "fast", "time_complexity": "O(1)"}
        assert _validate_alternatives_item(item) is True

    def test_missing_code_returns_false(self):
        assert _validate_alternatives_item({"tradeoff": "fast", "time_complexity": "O(1)"}) is False

    def test_missing_tradeoff_returns_false(self):
        assert _validate_alternatives_item({"code": "x=1", "time_complexity": "O(1)"}) is False

    def test_missing_both_complexities_returns_false(self):
        assert _validate_alternatives_item({"code": "x=1", "tradeoff": "fast"}) is False

    def test_space_complexity_only_is_ok(self):
        item = {"code": "x = 1", "tradeoff": "fast", "space_complexity": "O(N)"}
        assert _validate_alternatives_item(item) is True


class TestValidateSecurityResponse:
    def _base(self):
        return {
            "grade": "A",
            "score": 85,
            "vulnerabilities": [],
            "summary": "All clear.",
        }

    def test_valid_response_passes(self):
        ok, err = _validate_security_response(self._base(), 10)
        assert ok is True
        assert err == ""

    def test_missing_grade_fails(self):
        d = self._base()
        del d["grade"]
        ok, err = _validate_security_response(d, 10)
        assert ok is False
        assert "grade" in err

    def test_not_a_dict_fails(self):
        ok, err = _validate_security_response(["a", "b"], 10)
        assert ok is False

    def test_vulnerabilities_not_list_fails(self):
        d = self._base()
        d["vulnerabilities"] = "not a list"
        ok, err = _validate_security_response(d, 10)
        assert ok is False
        assert "array" in err.lower()

    def test_invalid_severity_fails(self):
        d = self._base()
        d["vulnerabilities"] = [{"severity": "EXTREME", "title": "t"}]
        ok, err = _validate_security_response(d, 10)
        assert ok is False
        assert "EXTREME" in err

    def test_valid_severity_enum_passes(self):
        d = self._base()
        for sev in _SEVERITY_ENUM:
            d["vulnerabilities"] = [{"severity": sev}]
            ok, err = _validate_security_response(d, 100)
            assert ok is True, f"Severity {sev} should pass: {err}"

    def test_line_number_clamped_to_bounds(self):
        d = self._base()
        vuln = {"severity": "HIGH", "line_number": 9999}
        d["vulnerabilities"] = [vuln]
        _validate_security_response(d, 50)
        assert vuln["line_number"] == 50  # clamped to file size

    def test_line_number_below_1_clamped(self):
        d = self._base()
        vuln = {"severity": "LOW", "line_number": -5}
        d["vulnerabilities"] = [vuln]
        _validate_security_response(d, 50)
        assert vuln["line_number"] == 1

    def test_null_line_number_preserved(self):
        d = self._base()
        vuln = {"severity": "LOW", "line_number": None}
        d["vulnerabilities"] = [vuln]
        ok, _ = _validate_security_response(d, 50)
        assert ok is True
        assert vuln["line_number"] is None


class TestCheckPrSections:
    _FULL_MD = (
        "## 📌 PR Summary\nSome summary\n\n"
        "## ⚠️ Technical Risks & Caveats\nSome risks\n\n"
        "## 🧪 Suggested Test Cases\nSome tests\n\n"
        "## 📋 Code Changes Breakdown\nSome breakdown\n"
    )

    def test_complete_markdown_no_missing(self):
        assert _check_pr_sections(self._FULL_MD) == []

    def test_missing_summary_detected(self):
        md = self._FULL_MD.replace("PR Summary", "Introduction")
        missing = _check_pr_sections(md)
        assert any("PR Summary" in s for s in missing)

    def test_missing_risks_detected(self):
        md = self._FULL_MD.replace("Technical Risks", "Notes")
        missing = _check_pr_sections(md)
        assert any("Technical Risks" in s for s in missing)

    def test_all_four_sections_missing(self):
        missing = _check_pr_sections("# Random Document\nSome content\n")
        assert len(missing) == 4


class TestHasHighRiskCode:
    def test_auth_code_is_high_risk(self):
        assert _has_high_risk_code("def check_auth(token): pass") is True

    def test_payment_code_is_high_risk(self):
        assert _has_high_risk_code("stripe.charge(amount)") is True

    def test_db_code_is_high_risk(self):
        # "sql" keyword appears in the query string
        assert _has_high_risk_code("db.execute('SELECT * FROM users')") is True

    def test_plain_code_is_not_high_risk(self):
        assert _has_high_risk_code("def add(a, b):\n    return a + b\n") is False

    def test_jwt_is_high_risk(self):
        assert _has_high_risk_code("jwt.decode(token)") is True


# ---------------------------------------------------------------------------
# explain() — parse-check and retry behaviour
# ---------------------------------------------------------------------------
class TestExplainHardening:
    def test_good_output_returned_directly(self):
        good_output = "### What This Code Does\nIt adds two numbers.\n\n### Complexity\nO(1)\n"
        with _mock_llm(good_output):
            explanation, lang, depth = explain(_SIMPLE_PY, "python", "beginner")
        assert explanation == good_output
        assert lang == "python"
        assert depth == "beginner"

    def test_output_without_headings_triggers_retry(self):
        bad_output = "This code adds two numbers. No headings here."
        good_retry = "### Overview\nAdds two numbers.\n"
        with _mock_llm_sequence(bad_output, good_retry):
            explanation, _, _ = explain(_SIMPLE_PY, "python", "beginner")
        assert explanation == good_retry

    def test_depth_levels_all_resolve(self):
        good = "### Title\nContent\n"
        for depth in ("beginner", "intermediate", "advanced"):
            with _mock_llm(good):
                _, _, depth_out = explain(_SIMPLE_PY, "python", depth)
            assert depth_out == depth

    def test_invalid_depth_defaults_to_beginner(self):
        good = "### Title\nContent\n"
        with _mock_llm(good):
            _, _, depth_out = explain(_SIMPLE_PY, "python", "expert")
        assert depth_out == "beginner"

    def test_llm_error_returns_error_message(self):
        with patch("app.llm_interface.client._call_model", side_effect=RuntimeError("timeout")):
            explanation, _, _ = explain(_SIMPLE_PY, "python")
        assert "Unable to generate" in explanation or "timeout" in explanation


# ---------------------------------------------------------------------------
# humanize() — similarity guard and Python syntax check
# ---------------------------------------------------------------------------
class TestHumanizeHardening:
    def test_normal_output_returned(self):
        rewritten = "def add(a: int, b: int) -> int:\n    # Add two numbers\n    return a + b\n"
        with _mock_llm(rewritten):
            result, _, _ = humanize(_SIMPLE_PY, "python")
        # Compare stripped — ast.unparse may drop trailing newline
        assert result.strip() == rewritten.strip()

    def test_echo_output_triggers_retry(self):
        """If LLM returns the exact same code, it should retry once."""
        retry_output = "# Human version\ndef add(a: int, b: int) -> int:\n    return a + b\n"
        with _mock_llm_sequence(_SIMPLE_PY, retry_output):
            result, _, _ = humanize(_SIMPLE_PY, "python")
        assert result.strip() == retry_output.strip()

    def test_python_syntax_error_falls_back_to_cleaned_original(self):
        """If humanized Python is syntactically invalid, we return the original cleaned output."""
        invalid_py = "def add(a b):\n    return a + b\n"  # syntax error
        with _mock_llm(invalid_py):
            result, lang, _ = humanize(_SIMPLE_PY, "python")
        # Result should be the cleaned (fence-stripped) LLM output, not a crash.
        assert lang == "python"
        assert isinstance(result, str)

    def test_code_fence_stripped_from_output(self):
        fenced = "```python\ndef add(a, b):\n    return a + b\n```"
        with _mock_llm(fenced):
            result, _, _ = humanize(_SIMPLE_PY, "python")
        assert "```" not in result

    def test_modes_all_accepted(self):
        good = "# done\ndef f(): pass\n"
        for mode in ("de-ai", "simplify", "idiomatic"):
            with _mock_llm(good):
                _, _, mode_out = humanize(_SIMPLE_PY, "python", mode)
            assert mode_out == mode

    def test_invalid_mode_defaults_to_de_ai(self):
        good = "# done\ndef f(): pass\n"
        with _mock_llm(good):
            _, _, mode_out = humanize(_SIMPLE_PY, "python", "magic")
        assert mode_out == "de-ai"


# ---------------------------------------------------------------------------
# alternatives() — schema validation and retry
# ---------------------------------------------------------------------------
class TestAlternativesHardening:
    _VALID_JSON = json.dumps([
        {
            "name": "Functional",
            "code": "result = sum(x*2 for x in numbers)",
            "tradeoff": "More Pythonic",
            "pros": ["concise"],
            "cons": [],
            "time_complexity": "O(N)",
            "space_complexity": "O(1)",
        }
    ])

    def test_valid_json_returned_correctly(self):
        with _mock_llm(self._VALID_JSON):
            alts, lang = alternatives("numbers = [1,2,3]\nres = [x*2 for x in numbers]", "python")
        assert len(alts) >= 1
        assert alts[0]["name"] == "Functional"
        assert alts[0]["time_complexity"] == "O(N)"

    def test_invalid_json_triggers_retry(self):
        bad_json = "Here are alternatives: {not valid json}"
        with _mock_llm_sequence(bad_json, self._VALID_JSON):
            alts, _ = alternatives(_SIMPLE_PY, "python")
        assert len(alts) >= 1
        assert alts[0]["code"] != _SIMPLE_PY  # should not be fallback

    def test_json_missing_complexity_triggers_retry(self):
        no_complexity = json.dumps([{"name": "Alt", "code": "x=1", "tradeoff": "fast"}])
        with _mock_llm_sequence(no_complexity, self._VALID_JSON):
            alts, _ = alternatives(_SIMPLE_PY, "python")
        # Should have retried and returned the valid JSON from the retry
        assert alts[0]["time_complexity"] is not None

    def test_fallback_on_double_failure(self):
        bad = "not json at all"
        with _mock_llm_sequence(bad, bad):
            alts, _ = alternatives(_SIMPLE_PY, "python")
        # Should not raise — returns fallback item
        assert isinstance(alts, list)
        assert len(alts) >= 1

    def test_pros_cons_always_lists(self):
        with _mock_llm(self._VALID_JSON):
            alts, _ = alternatives(_SIMPLE_PY, "python")
        for alt in alts:
            assert isinstance(alt["pros"], list)
            assert isinstance(alt["cons"], list)

    def test_json_surrounded_by_prose_still_parsed(self):
        prose_wrapped = f"Here are your alternatives:\n\n{self._VALID_JSON}\n\nHope that helps!"
        with _mock_llm(prose_wrapped):
            alts, _ = alternatives(_SIMPLE_PY, "python")
        assert alts[0]["name"] == "Functional"


# ---------------------------------------------------------------------------
# security_audit() — schema validation, severity enum, line_number clamping
# ---------------------------------------------------------------------------
class TestSecurityAuditHardening:
    _VALID_JSON = json.dumps({
        "grade": "B",
        "score": 72,
        "vulnerabilities": [
            {
                "severity": "HIGH",
                "category": "OWASP Top 10",
                "title": "SQL Injection",
                "description": "Raw query.",
                "line_number": 3,
                "recommendation": "Use parameterized queries.",
            }
        ],
        "summary": "One HIGH vulnerability found.",
    })

    def test_valid_response_parsed_correctly(self):
        code = "def query(uid):\n    db.execute(f'SELECT * FROM users WHERE id={uid}')\n"
        with _mock_llm(self._VALID_JSON):
            result, lang = security_audit(code, "python")
        assert result["grade"] == "B"
        assert result["score"] == 72
        assert len(result["vulnerabilities"]) >= 1
        assert result["vulnerabilities"][-1]["severity"] == "HIGH"

    def test_secrets_detected_deterministically(self):
        code = 'API_KEY = "sk-abcdefghijklmnopqrstuvwxyz123456"\n'
        with _mock_llm(self._VALID_JSON):
            result, _ = security_audit(code, "python")
        assert result["secrets_found"] >= 1
        assert "YOUR_ENV_SECRET_KEY" in result["sanitized_code"]

    def test_secrets_cap_score_at_50(self):
        high_score_json = json.dumps({
            "grade": "A+", "score": 99, "vulnerabilities": [], "summary": "Clean."
        })
        code = 'API_KEY = "sk-abcdefghijklmnopqrstuvwxyz123456"\n'
        with _mock_llm(high_score_json):
            result, _ = security_audit(code)
        assert result["score"] <= 50

    def test_missing_required_key_triggers_retry(self):
        incomplete = json.dumps({"grade": "A", "score": 90, "vulnerabilities": []})  # missing summary
        with _mock_llm_sequence(incomplete, self._VALID_JSON):
            result, _ = security_audit(_SIMPLE_PY, "python")
        assert "summary" in result

    def test_invalid_json_triggers_retry(self):
        with _mock_llm_sequence("not json", self._VALID_JSON):
            result, _ = security_audit(_SIMPLE_PY, "python")
        assert "grade" in result

    def test_fallback_on_double_failure(self):
        with _mock_llm_sequence("bad", "also bad"):
            result, _ = security_audit(_SIMPLE_PY, "python")
        assert "grade" in result
        assert "score" in result

    def test_json_surrounded_by_prose_still_parsed(self):
        prose = f"Here is my analysis:\n\n{self._VALID_JSON}\n\nI hope this helps."
        with _mock_llm(prose):
            result, _ = security_audit(_SIMPLE_PY, "python")
        assert result["grade"] == "B"

    def test_score_clamped_to_0_100(self):
        extreme = json.dumps({"grade": "A", "score": 150, "vulnerabilities": [], "summary": "x"})
        with _mock_llm(extreme):
            result, _ = security_audit(_SIMPLE_PY, "python")
        assert 0 <= result["score"] <= 100


# ---------------------------------------------------------------------------
# translate() — caveats for known pairs, non-empty notes
# ---------------------------------------------------------------------------
class TestTranslateHardening:
    def test_known_pair_caveat_injected(self):
        """For Python→Go the caveat text must appear in the system prompt sent to LLM.
        We verify it indirectly: the call_model mock captures kwargs and we check the
        system_prompt contains goroutine-related text."""
        call_args = []

        def capture_call(prompt, system_prompt=None):
            call_args.append(system_prompt or "")
            return ("```go\nfunc add(a, b int) int { return a + b }\n```\n- Note: goroutines differ", "mock/model")

        py_code = "def add(a, b):\n    return a + b\n"
        with patch("app.llm_interface.client._call_model", side_effect=capture_call):
            code_out, notes, src = translate(py_code, "python", "Go")

        assert len(call_args) == 1
        assert "goroutine" in call_args[0].lower(), (
            f"Expected goroutine caveat in system prompt for Python→Go, got: {call_args[0][:200]}"
        )

    def test_known_pair_python_rust_caveat(self):
        call_args = []

        def capture(prompt, system_prompt=None):
            call_args.append(system_prompt or "")
            return ("```rust\nfn add(a: i32, b: i32) -> i32 { a + b }\n```\n- Note: ownership differs", "mock/model")

        with patch("app.llm_interface.client._call_model", side_effect=capture):
            translate(_SIMPLE_PY, "python", "Rust")

        assert "ownership" in call_args[0].lower()

    def test_unknown_pair_no_caveat_added(self):
        call_args = []

        def capture(prompt, system_prompt=None):
            call_args.append(system_prompt or "")
            return ("```cobol\nADD A B GIVING C.\n```\n- Note: COBOL uses different syntax", "mock/model")

        with patch("app.llm_interface.client._call_model", side_effect=capture):
            translate(_SIMPLE_PY, "python", "COBOL")

        # No special caveat for this pair — just the base prompt
        assert "COBOL" in call_args[0]
        # No language-specific-caveats section for unknown pairs
        assert "Language-specific caveats" not in call_args[0]

    def test_notes_non_empty_fallback_when_llm_omits_them(self):
        output_no_notes = "```go\nfunc add(a, b int) int { return a + b }\n```"
        with _mock_llm(output_no_notes):
            _, notes, _ = translate(_SIMPLE_PY, "python", "Go")
        assert len(notes) > 0
        assert all(isinstance(n, str) and n.strip() for n in notes)

    def test_notes_extracted_from_llm_output(self):
        output = "```typescript\nfunction add(a: number, b: number): number { return a + b; }\n```\n- Note: Use explicit types\n- Note: ESM import syntax"
        with _mock_llm(output):
            _, notes, _ = translate(_SIMPLE_PY, "python", "TypeScript")
        assert len(notes) >= 1

    def test_source_language_returned(self):
        with _mock_llm("```go\nfunc f() {}\n```\n- Note: Go uses goroutines"):
            _, _, src = translate(_SIMPLE_PY, "python", "Go")
        assert src == "python"

    def test_all_known_pairs_have_caveats(self):
        """Smoke-test: every key in _TRANSLATION_CAVEATS has a non-empty value."""
        for pair, caveat in _TRANSLATION_CAVEATS.items():
            assert caveat.strip(), f"Empty caveat for pair: {pair}"
            src, _, tgt = pair.partition("→")
            assert src and tgt, f"Malformed pair key: {pair}"


# ---------------------------------------------------------------------------
# pr_review() — required sections, retry, high-risk enforcement
# ---------------------------------------------------------------------------
class TestPrReviewHardening:
    _FULL_MARKDOWN = (
        "## 📌 PR Summary\nAdds payment logic.\n\n"
        "## ⚠️ Technical Risks & Caveats\n- SQL injection risk\n\n"
        "## 🧪 Suggested Test Cases\n- Test happy path\n\n"
        "## 📋 Code Changes Breakdown\n- Added process_payment\n"
    )

    def test_complete_response_returned_directly(self):
        with _mock_llm(self._FULL_MARKDOWN):
            summary, md, risks, tests, lang = pr_review(_SIMPLE_PY, "python", "My PR")
        assert "PR Summary" in md
        assert "Technical Risks" in md
        assert summary.startswith("Pull Request review")

    def test_missing_section_triggers_retry(self):
        incomplete = (
            "## 📌 PR Summary\nSome summary\n\n"
            "## 🧪 Suggested Test Cases\nTest it\n\n"
            # Missing Technical Risks and Code Changes
        )
        with _mock_llm_sequence(incomplete, self._FULL_MARKDOWN):
            _, md, _, _, _ = pr_review(_SIMPLE_PY, "python")
        assert "Technical Risks" in md

    def test_high_risk_code_populates_risk_list(self):
        auth_code = "def check_login(password):\n    token = jwt.decode(password)\n    return token\n"
        md_no_risks = (
            "## 📌 PR Summary\nSome summary\n\n"
            "## ⚠️ Technical Risks & Caveats\n\n"  # empty section
            "## 🧪 Suggested Test Cases\n- Test it\n\n"
            "## 📋 Code Changes Breakdown\n- login function\n"
        )
        with _mock_llm(md_no_risks):
            _, _, risks, _, _ = pr_review(auth_code, "python", "Login PR")
        # High-risk code must force a non-empty risks list
        assert len(risks) > 0

    def test_non_high_risk_code_empty_risks_allowed(self):
        plain_code = "def square(x):\n    return x * x\n"
        md_no_risks = (
            "## 📌 PR Summary\nSome summary\n\n"
            "## ⚠️ Technical Risks & Caveats\n\n"
            "## 🧪 Suggested Test Cases\n- Test it\n\n"
            "## 📋 Code Changes Breakdown\n- square fn\n"
        )
        with _mock_llm(md_no_risks):
            _, _, risks, _, _ = pr_review(plain_code, "python")
        # No enforcement — empty risks is acceptable for non-risky code
        assert isinstance(risks, list)

    def test_tests_extracted_from_correct_section(self):
        with _mock_llm(self._FULL_MARKDOWN):
            _, _, _, tests, _ = pr_review(_SIMPLE_PY, "python")
        assert isinstance(tests, list)

    def test_detected_language_returned(self):
        with _mock_llm(self._FULL_MARKDOWN):
            _, _, _, _, lang = pr_review(_SIMPLE_PY, "python")
        assert lang == "python"

    def test_llm_error_returns_fallback(self):
        with patch("app.llm_interface.client._call_model", side_effect=RuntimeError("timeout")):
            summary, md, _, _, _ = pr_review(_SIMPLE_PY, "python")
        assert "failed" in summary.lower() or "failed" in md.lower()
