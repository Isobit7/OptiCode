"""
Golden-set eval harness CLI runner.

Usage (from backend/ directory):

  # Run all endpoints against all snippets (requires LLM keys in env)
  python -m eval.run_golden_set

  # Run only specific categories
  python -m eval.run_golden_set --category explain,security,translate

  # Run only specific snippet IDs
  python -m eval.run_golden_set --snippet py_bst,js_debounce

  # Show only failures
  python -m eval.run_golden_set --failures-only

Exit code: 0 = all passed, 1 = one or more failures.

This runner is intentionally separate from pytest so it can be triggered
manually against real LLM output. The same criteria functions are used by
tests/test_golden_set.py which patches _call_model to run offline.
"""

import argparse
import json
import os
import sys
import traceback
from typing import Any, Dict, List, Optional, Tuple

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

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
# Per-category runners
# ---------------------------------------------------------------------------

def run_explain(snippet: Dict[str, Any], depth: str = "beginner") -> EvalResult:
    snippet_with_depth = dict(snippet, _requested_depth=depth)
    try:
        explanation, detected, depth_out = explain(snippet["code"], snippet["language"], depth)
        return check_explain(explanation, detected, depth_out, snippet_with_depth)
    except Exception as e:
        return EvalResult(passed=False, failures=[f"Exception: {e}"])


def run_humanize(snippet: Dict[str, Any], mode: str = "de-ai") -> EvalResult:
    try:
        result, detected, mode_out = humanize(snippet["code"], snippet["language"], mode)
        return check_humanize(result, detected, mode_out, snippet)
    except Exception as e:
        return EvalResult(passed=False, failures=[f"Exception: {e}"])


def run_alternatives(snippet: Dict[str, Any]) -> EvalResult:
    try:
        alts, detected = alternatives(snippet["code"], snippet["language"])
        return check_alternatives(alts, detected, snippet)
    except Exception as e:
        return EvalResult(passed=False, failures=[f"Exception: {e}"])


def run_security(snippet: Dict[str, Any]) -> EvalResult:
    try:
        result, detected = security_audit(snippet["code"], snippet["language"])
        return check_security_audit(result, detected, snippet)
    except Exception as e:
        return EvalResult(passed=False, failures=[f"Exception: {e}"])


def run_translate(snippet: Dict[str, Any], target: str = "TypeScript") -> EvalResult:
    try:
        code_out, notes, src = translate(snippet["code"], snippet["language"], target)
        return check_translate(code_out, notes, src, snippet, target)
    except Exception as e:
        return EvalResult(passed=False, failures=[f"Exception: {e}"])


def run_pr_review(snippet: Dict[str, Any]) -> EvalResult:
    try:
        summary, md, risks, tests, detected = pr_review(
            snippet["code"], snippet["language"], pr_title=f"Review: {snippet['id']}"
        )
        return check_pr_review(summary, md, risks, tests, detected, snippet)
    except Exception as e:
        return EvalResult(passed=False, failures=[f"Exception: {e}"])


def run_flowchart(snippet: Dict[str, Any]) -> EvalResult:
    try:
        mermaid, count, summary, detected = flowchart(snippet["code"], snippet["language"])
        return check_flowchart(mermaid, count, summary, detected, snippet)
    except Exception as e:
        return EvalResult(passed=False, failures=[f"Exception: {e}"])


def run_diff_story(snippet: Dict[str, Any]) -> EvalResult:
    """For diff_story we fabricate a trivial before/after from the snippet."""
    from app.routes.diff_story import generate_diff_story, DiffStoryRequest

    # Create a minimal synthetic diff: add a comment line
    before = snippet["code"]
    after = "# Refactored\n" + snippet["code"]
    try:
        req = DiffStoryRequest(before_code=before, after_code=after, language=snippet["language"])
        resp = generate_diff_story(req)
        return check_diff_story(resp.model_dump(), snippet)
    except Exception as e:
        return EvalResult(passed=False, failures=[f"Exception: {e}"])


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------
_ALL_CATEGORIES = {
    "explain": run_explain,
    "humanize": run_humanize,
    "alternatives": run_alternatives,
    "security": run_security,
    "translate": run_translate,
    "pr_review": run_pr_review,
    "flowchart": run_flowchart,
    "diff_story": run_diff_story,
}


def run_suite(
    categories: Optional[List[str]] = None,
    snippet_ids: Optional[List[str]] = None,
    failures_only: bool = False,
) -> Tuple[int, int]:
    """Run the eval suite. Returns (passed_count, failed_count)."""
    cats = categories or list(_ALL_CATEGORIES.keys())
    snippets = (
        [SNIPPET_BY_ID[sid] for sid in snippet_ids if sid in SNIPPET_BY_ID]
        if snippet_ids
        else GOLDEN_SNIPPETS
    )

    passed = 0
    failed = 0
    results = []

    for snippet in snippets:
        for cat in cats:
            runner = _ALL_CATEGORIES.get(cat)
            if not runner:
                continue
            result = runner(snippet)
            label = f"{cat:15s}  {snippet['id']}"
            if result.passed:
                passed += 1
                if not failures_only:
                    print(f"  PASS  {label}")
            else:
                failed += 1
                print(f"  FAIL  {label}")
                for f in result.failures:
                    print(f"        → {f}")

    print(f"\n{'='*60}")
    print(f"  Total: {passed + failed}  |  Passed: {passed}  |  Failed: {failed}")
    return passed, failed


def main():
    parser = argparse.ArgumentParser(description="OptiCode golden-set eval harness")
    parser.add_argument(
        "--category",
        type=str,
        default=None,
        help="Comma-separated list of categories: explain,humanize,alternatives,security,translate,pr_review,flowchart,diff_story",
    )
    parser.add_argument(
        "--snippet",
        type=str,
        default=None,
        help="Comma-separated list of snippet IDs to run.",
    )
    parser.add_argument(
        "--failures-only",
        action="store_true",
        help="Only print failing evaluations.",
    )
    args = parser.parse_args()

    cats = [c.strip() for c in args.category.split(",")] if args.category else None
    snippets = [s.strip() for s in args.snippet.split(",")] if args.snippet else None

    _, failed = run_suite(categories=cats, snippet_ids=snippets, failures_only=args.failures_only)
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
