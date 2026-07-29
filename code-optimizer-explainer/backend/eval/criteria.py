"""
Structural acceptance criteria for each LLM endpoint.

Each function takes the raw output from the corresponding llm_interface function
and returns an EvalResult(passed, failures) where failures is a list of
human-readable strings describing what did not meet the criteria.

These checks are intentionally structural / programmatic — not subjective quality
judgements — so they can be run as a CI gate without LLM non-determinism causing
flaky failures.

Imported from both:
  - tests/test_golden_set.py  (pytest, mock LLM)
  - eval/run_golden_set.py    (CLI, real LLM when keys present)
"""

import ast
import json
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class EvalResult:
    passed: bool
    failures: List[str] = field(default_factory=list)

    def __bool__(self) -> bool:
        return self.passed

    def summary(self) -> str:
        if self.passed:
            return "PASS"
        return "FAIL: " + "; ".join(self.failures)


# ---------------------------------------------------------------------------
# explain
# ---------------------------------------------------------------------------
def check_explain(
    explanation: str,
    detected_language: str,
    depth_level: str,
    snippet: Dict[str, Any],
) -> EvalResult:
    """
    Criteria:
      1. Output is non-empty.
      2. Contains at least one Markdown section heading (## or ###).
      3. depth_level matches what was requested.
      4. Does not contain the literal string '[STUB]' (LLM not configured).
    """
    failures = []
    if not explanation or not explanation.strip():
        failures.append("Explanation is empty.")
    if not re.search(r"^#{1,3}\s+\S", explanation, re.MULTILINE):
        failures.append("No Markdown section headings found in explanation.")
    expected_depth = snippet.get("_requested_depth", "beginner")
    if depth_level != expected_depth:
        failures.append(f"depth_level={depth_level!r} but requested {expected_depth!r}.")
    if "[STUB]" in explanation:
        failures.append("Explanation contains STUB marker — LLM not configured.")
    return EvalResult(passed=len(failures) == 0, failures=failures)


# ---------------------------------------------------------------------------
# humanize
# ---------------------------------------------------------------------------
def check_humanize(
    humanized_code: str,
    detected_language: str,
    mode_used: str,
    snippet: Dict[str, Any],
) -> EvalResult:
    """
    Criteria:
      1. Output is non-empty.
      2. Output differs from input (similarity guard — not an echo).
      3. No raw code fences in output (```).
      4. For Python: output is syntactically valid (ast.parse).
      5. [STUB] not present.
    """
    failures = []
    original = snippet["code"]

    if not humanized_code or not humanized_code.strip():
        failures.append("Humanized output is empty.")
    if humanized_code.strip() == original.strip():
        failures.append("Humanized output is identical to input — rewrite did not happen.")
    if "```" in humanized_code:
        failures.append("Humanized output contains raw code fences.")
    if snippet["language"] == "python" and humanized_code.strip():
        try:
            ast.parse(humanized_code)
        except SyntaxError as e:
            failures.append(f"Humanized Python output has syntax error: {e}")
    if "[STUB]" in humanized_code:
        failures.append("Humanized output contains STUB marker — LLM not configured.")

    return EvalResult(passed=len(failures) == 0, failures=failures)


# ---------------------------------------------------------------------------
# alternatives
# ---------------------------------------------------------------------------
def check_alternatives(
    alternatives_list: List[Dict[str, Any]],
    detected_language: str,
    snippet: Dict[str, Any],
) -> EvalResult:
    """
    Criteria:
      1. At least 1 alternative returned.
      2. Every alternative has non-empty 'code' and 'tradeoff'.
      3. At least one alternative has time_complexity or space_complexity populated.
      4. pros/cons are lists (not strings or None).
    """
    failures = []
    if not alternatives_list:
        failures.append("No alternatives returned.")
        return EvalResult(passed=False, failures=failures)

    for i, alt in enumerate(alternatives_list):
        if not alt.get("code", "").strip():
            failures.append(f"alternatives[{i}].code is empty.")
        if not alt.get("tradeoff", "").strip():
            failures.append(f"alternatives[{i}].tradeoff is empty.")
        if not isinstance(alt.get("pros"), list):
            failures.append(f"alternatives[{i}].pros must be a list.")
        if not isinstance(alt.get("cons"), list):
            failures.append(f"alternatives[{i}].cons must be a list.")

    has_complexity = any(
        alt.get("time_complexity") or alt.get("space_complexity")
        for alt in alternatives_list
    )
    if not has_complexity:
        failures.append("No alternative includes time_complexity or space_complexity.")

    return EvalResult(passed=len(failures) == 0, failures=failures)


# ---------------------------------------------------------------------------
# security_audit
# ---------------------------------------------------------------------------
_SEVERITY_ENUM = frozenset(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"])
_GRADE_ENUM = frozenset(["A+", "A", "B", "C", "D", "F"])


def check_security_audit(
    result: Dict[str, Any],
    detected_language: str,
    snippet: Dict[str, Any],
) -> EvalResult:
    """
    Criteria:
      1. All required top-level keys present: grade, score, vulnerabilities, summary.
      2. grade is a valid grade value.
      3. score is integer 0–100.
      4. vulnerabilities is a list.
      5. Every vulnerability has valid severity (or is omitted), non-empty title.
      6. sanitized_code is present.
      7. For snippets tagged 'security': secrets_found is tracked (int).
    """
    failures = []
    required = {"grade", "score", "vulnerabilities", "summary", "sanitized_code"}
    missing = required - set(result.keys())
    if missing:
        failures.append(f"Missing required keys: {sorted(missing)}.")

    grade = result.get("grade", "")
    if grade not in _GRADE_ENUM:
        failures.append(f"grade={grade!r} not in {sorted(_GRADE_ENUM)}.")

    score = result.get("score")
    try:
        score_int = int(score)
        if not (0 <= score_int <= 100):
            failures.append(f"score={score_int} out of 0-100 range.")
    except (TypeError, ValueError):
        failures.append(f"score={score!r} is not an integer.")

    vulns = result.get("vulnerabilities", [])
    if not isinstance(vulns, list):
        failures.append("vulnerabilities must be a list.")
    else:
        for i, v in enumerate(vulns):
            if not isinstance(v, dict):
                failures.append(f"vulnerabilities[{i}] is not a dict.")
                continue
            sev = str(v.get("severity", "")).upper()
            if sev and sev not in _SEVERITY_ENUM:
                failures.append(f"vulnerabilities[{i}].severity={sev!r} invalid.")
            if not v.get("title", "").strip():
                failures.append(f"vulnerabilities[{i}].title is empty.")

    if "security" in snippet.get("tags", []):
        sf = result.get("secrets_found")
        if not isinstance(sf, int):
            failures.append("secrets_found must be an integer for security-tagged snippets.")

    return EvalResult(passed=len(failures) == 0, failures=failures)


# ---------------------------------------------------------------------------
# translate
# ---------------------------------------------------------------------------
def check_translate(
    translated_code: str,
    notes: List[str],
    source_language: str,
    snippet: Dict[str, Any],
    target_language: str,
) -> EvalResult:
    """
    Criteria:
      1. translated_code is non-empty.
      2. No raw code fences in translated_code.
      3. notes is a non-empty list.
      4. Each note is a non-empty string.
      5. translated_code does not equal the original (translation happened).
    """
    failures = []
    original = snippet["code"]

    if not translated_code or not translated_code.strip():
        failures.append("Translated code is empty.")
    if "```" in translated_code:
        failures.append("Translated code still contains code fence markers.")
    if not isinstance(notes, list) or len(notes) == 0:
        failures.append("notes must be a non-empty list.")
    else:
        for i, note in enumerate(notes):
            if not isinstance(note, str) or not note.strip():
                failures.append(f"notes[{i}] is empty or not a string.")

    if translated_code.strip() == original.strip():
        failures.append("Translated output is identical to input (translation did not occur).")

    return EvalResult(passed=len(failures) == 0, failures=failures)


# ---------------------------------------------------------------------------
# pr_review
# ---------------------------------------------------------------------------
_PR_REQUIRED_SECTION_STEMS = ["PR Summary", "Technical Risks", "Suggested Test", "Code Changes"]


def check_pr_review(
    summary: str,
    github_markdown: str,
    potential_risks: List[str],
    test_suggestions: List[str],
    detected_language: str,
    snippet: Dict[str, Any],
) -> EvalResult:
    """
    Criteria:
      1. summary is non-empty.
      2. github_markdown contains all four required section stems.
      3. potential_risks is a list.
      4. test_suggestions is a list.
      5. For high-risk snippets (auth/security tags): potential_risks non-empty.
    """
    failures = []
    if not summary or not summary.strip():
        failures.append("summary is empty.")

    for stem in _PR_REQUIRED_SECTION_STEMS:
        if not re.search(re.escape(stem), github_markdown, re.IGNORECASE):
            failures.append(f"github_markdown missing required section: '{stem}'.")

    if not isinstance(potential_risks, list):
        failures.append("potential_risks must be a list.")
    if not isinstance(test_suggestions, list):
        failures.append("test_suggestions must be a list.")

    is_high_risk = any(t in snippet.get("tags", []) for t in ("auth", "security", "database", "sql"))
    if is_high_risk and not potential_risks:
        failures.append(
            "potential_risks is empty for high-risk snippet (auth/security/db tags present)."
        )

    return EvalResult(passed=len(failures) == 0, failures=failures)


# ---------------------------------------------------------------------------
# flowchart
# ---------------------------------------------------------------------------
def check_flowchart(
    mermaid_code: str,
    nodes_count: int,
    summary: str,
    detected_language: str,
    snippet: Dict[str, Any],
) -> EvalResult:
    """
    Criteria:
      1. mermaid_code starts with 'graph' or 'flowchart'.
      2. mermaid_code contains at least one '-->' edge.
      3. nodes_count >= 2 (at least start and one more node).
      4. summary is non-empty.
      5. mermaid_code passes the mermaid_sanitizer.validate() check.
    """
    from app.mermaid_sanitizer import validate as _mermaid_validate

    failures = []
    stripped = mermaid_code.strip()

    if not re.match(r"^(graph|flowchart)\s", stripped, re.IGNORECASE):
        failures.append("mermaid_code does not start with 'graph' or 'flowchart'.")
    if "-->" not in mermaid_code:
        failures.append("mermaid_code contains no '-->' edges.")
    if nodes_count < 2:
        failures.append(f"nodes_count={nodes_count} — expected at least 2.")
    if not summary or not summary.strip():
        failures.append("summary is empty.")

    ok, reason = _mermaid_validate(mermaid_code)
    if not ok:
        failures.append(f"mermaid_sanitizer.validate() failed: {reason}")

    return EvalResult(passed=len(failures) == 0, failures=failures)


# ---------------------------------------------------------------------------
# diff_story
# ---------------------------------------------------------------------------
def check_diff_story(
    result_dict: Dict[str, Any],
    snippet: Dict[str, Any],
) -> EvalResult:
    """
    Criteria:
      1. summary is non-empty string.
      2. key_changes is a non-empty list.
      3. reasoning is a non-empty string.
      4. detected_language is a non-empty string.
    """
    failures = []
    if not result_dict.get("summary", "").strip():
        failures.append("summary is empty.")
    kc = result_dict.get("key_changes", [])
    if not isinstance(kc, list) or len(kc) == 0:
        failures.append("key_changes must be a non-empty list.")
    if not result_dict.get("reasoning", "").strip():
        failures.append("reasoning is empty.")
    if not result_dict.get("detected_language", "").strip():
        failures.append("detected_language is empty.")
    return EvalResult(passed=len(failures) == 0, failures=failures)
