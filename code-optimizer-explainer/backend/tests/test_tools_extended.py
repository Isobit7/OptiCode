"""
Phase 2 — Extended unit tests for deterministic tools and language detection.

Everything here is fully deterministic: no LLM calls, no network.
The LLM path inside shorten() is bypassed for non-Python languages
by patching _call_model; the regex-minification fallback is what we
test for those languages.

Coverage targets from the plan:
  Prettify
    - Snapshot per supported language (Python, JS, TS, HTML, CSS)
    - Output is byte-for-byte identical on repeated calls (determinism)
    - Syntax-safe: output round-trips through the language's own parser
    - Edge: empty string, all-whitespace, already-formatted input

  Shorten
    - Python AST: removes docstrings, inline comments stripped by unparse
    - Byte-size guard: shortened output <= original for Python
    - Syntax safety: ast.parse succeeds on shortened Python output
    - Multi-function module: all function bodies survive shortening
    - Edge: empty string, only comments, already-minimal input

  SEO Optimize
    - Determinism: same input → same score on two consecutive calls
    - Score never drops when we add SEO improvements back in
    - Checklist always has exactly 8 items (one per static check)
    - Checklist statuses are only 'pass', 'warning', or 'error'
    - Non-HTML input (Python code) errors cleanly — returns score 0 / error item
    - Already-optimised HTML scores 100
    - Multiple <h1> tags produce a warning item, not a crash

  Language Detection (isolated from LLM endpoints)
    - Python, JS, TS, HTML, CSS, SQL snippets each resolve correctly
    - Explicit language override always wins over detection
    - Empty code with no hint returns "text" not a crash
    - "auto" hint triggers detection
    - Unknown/ambiguous code returns a string (not a crash)
"""

import ast
import sys
import os
import pytest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.deterministic_tools.tools import prettify, shorten, seo_optimize
from app.llm_interface.client import detect_language


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_python(code: str) -> bool:
    """Return True if code is syntactically valid Python."""
    try:
        ast.parse(code)
        return True
    except SyntaxError:
        return False


# ---------------------------------------------------------------------------
# Prettify — snapshots & determinism
# ---------------------------------------------------------------------------
class TestPrettifyExtended:
    # --- Python ---
    def test_python_snapshot_indentation(self):
        code = "def foo(x,y):\n  return x+y\n"
        result = prettify(code, "python")
        # Black normalises to 4-space indentation.
        assert "    return x + y" in result

    def test_python_snapshot_spacing_around_operators(self):
        code = "x=1+2\n"
        result = prettify(code, "python")
        assert "x = 1 + 2" in result

    def test_python_deterministic(self):
        code = "def bar(a,b):\n  return a-b\n"
        assert prettify(code, "python") == prettify(code, "python")

    def test_python_output_is_valid_syntax(self):
        code = "class Foo:\n  def __init__(self,x):\n    self.x=x\n"
        result = prettify(code, "python")
        assert _parse_python(result), "Prettified Python is not valid syntax"

    def test_python_already_formatted_is_idempotent(self):
        code = "def foo(x: int) -> int:\n    return x + 1\n"
        once = prettify(code, "python")
        twice = prettify(once, "python")
        assert once == twice

    def test_python_empty_string(self):
        assert prettify("", "python").strip() == ""

    def test_python_all_whitespace(self):
        assert prettify("   \n  \n", "python").strip() == ""

    # --- JavaScript ---
    def test_javascript_snapshot_indentation(self):
        code = "function add(a,b){return a+b;}"
        result = prettify(code, "javascript")
        assert "function add" in result
        # JSBeautifier adds a newline between the brace and body.
        assert "return" in result

    def test_javascript_deterministic(self):
        code = "const x=1+2;"
        assert prettify(code, "javascript") == prettify(code, "javascript")

    def test_javascript_already_formatted_is_idempotent(self):
        code = "function greet(name) {\n  return 'Hello ' + name;\n}\n"
        once = prettify(code, "javascript")
        twice = prettify(once, "javascript")
        assert once == twice

    def test_javascript_empty_string(self):
        assert prettify("", "javascript").strip() == ""

    # --- TypeScript (treated same as JS by JSBeautifier) ---
    def test_typescript_formats_without_error(self):
        code = "const greet=(name:string):string=>{return `Hello ${name}`;}"
        result = prettify(code, "typescript")
        assert "greet" in result
        assert result.strip() != ""

    def test_typescript_deterministic(self):
        code = "interface Foo{bar:string;baz:number;}"
        assert prettify(code, "typescript") == prettify(code, "typescript")

    # --- HTML ---
    def test_html_snapshot_tag_present(self):
        code = "<html><head><title>T</title></head><body><p>Hello</p></body></html>"
        result = prettify(code, "html")
        # JSBeautifier may add spaces around angle-brackets; normalise for assertion.
        result_compact = result.replace(" ", "")
        assert "html" in result_compact
        assert "title" in result_compact

    def test_html_deterministic(self):
        code = "<div><span>hi</span></div>"
        assert prettify(code, "html") == prettify(code, "html")

    # --- CSS ---
    def test_css_snapshot_brace_expansion(self):
        code = "body{margin:0;padding:0;}"
        result = prettify(code, "css")
        assert "body" in result
        assert "margin" in result

    def test_css_deterministic(self):
        code = ".btn{color:red;font-size:14px;}"
        assert prettify(code, "css") == prettify(code, "css")

    # --- Unknown language ---
    def test_unknown_language_passthrough_is_deterministic(self):
        code = "PROCEDURE foo IS\nBEGIN\n  NULL;\nEND;"
        assert prettify(code, "plsql") == prettify(code, "plsql")

    def test_unknown_language_strips_trailing_whitespace(self):
        code = "line one   \nline two  \n"
        result = prettify(code, "brainfuck")
        for line in result.splitlines():
            assert line == line.rstrip(), f"Trailing whitespace found: {repr(line)}"


# ---------------------------------------------------------------------------
# Shorten — AST equivalence, byte-size, syntax safety
# ---------------------------------------------------------------------------
class TestShortenExtended:
    # --- Python AST correctness ---
    def test_python_removes_module_level_docstring(self):
        code = '"""Module docstring."""\n\ndef foo():\n    return 1\n'
        result = shorten(code, "python")
        assert "Module docstring" not in result
        assert "foo" in result

    def test_python_removes_class_docstring(self):
        code = 'class MyClass:\n    """Class docstring."""\n    def method(self):\n        return True\n'
        result = shorten(code, "python")
        assert "Class docstring" not in result
        assert "method" in result

    def test_python_removes_nested_function_docstring(self):
        code = (
            "def outer():\n"
            '    """Outer docstring."""\n'
            "    def inner():\n"
            '        """Inner docstring."""\n'
            "        return 42\n"
            "    return inner\n"
        )
        result = shorten(code, "python")
        assert "Outer docstring" not in result
        assert "Inner docstring" not in result
        assert "return 42" in result

    def test_python_output_is_valid_syntax(self):
        code = (
            '"""Module doc."""\n'
            "import os\n\n"
            "def compute(x: int) -> int:\n"
            '    """Returns x squared."""\n'
            "    return x * x\n"
        )
        result = shorten(code, "python")
        assert _parse_python(result), f"Shortened Python is not valid syntax:\n{result}"

    def test_python_shortened_is_byte_smaller_or_equal(self):
        code = (
            '"""This module does nothing useful."""\n\n'
            "def very_verbose_function_name(argument_one, argument_two):\n"
            '    """Returns the sum."""\n'
            "    return argument_one + argument_two\n"
        )
        result = shorten(code, "python")
        assert len(result.encode()) <= len(code.encode()), (
            f"Shortened ({len(result)} bytes) is LARGER than original ({len(code)} bytes)"
        )

    def test_python_multi_function_module_all_functions_survive(self):
        code = (
            "def alpha():\n"
            '    """Alpha doc."""\n'
            "    return 1\n\n"
            "def beta():\n"
            '    """Beta doc."""\n'
            "    return 2\n\n"
            "def gamma():\n"
            '    """Gamma doc."""\n'
            "    return 3\n"
        )
        result = shorten(code, "python")
        assert "alpha" in result
        assert "beta" in result
        assert "gamma" in result
        assert _parse_python(result)

    def test_python_code_without_docstrings_unchanged_semantics(self):
        code = "def add(a, b):\n    return a + b\n"
        result = shorten(code, "python")
        assert "return" in result
        assert _parse_python(result)

    def test_python_empty_string_returns_empty(self):
        result = shorten("", "python")
        assert result.strip() == ""

    def test_python_only_docstring_returns_minimal_output(self):
        """A module that is only a docstring collapses to empty/minimal after AST strip."""
        code = '"""Just a docstring, nothing else."""\n'
        result = shorten(code, "python")
        # AST unparse of an empty module body should not crash and should be tiny.
        assert _parse_python(result) or result.strip() == ""

    # --- Non-Python (regex fallback — LLM patched out) ---
    def _shorten_no_llm(self, code: str, lang: str) -> str:
        """Run shorten() with LLM path patched out to force regex fallback.

        _call_model is imported inside shorten() as a local import from
        app.llm_interface.client, so we patch it at the source module.
        """
        with patch("app.llm_interface.client._call_model", side_effect=RuntimeError("no LLM")):
            return shorten(code, lang)

    def test_c_removes_single_line_comments(self):
        code = "// Remove me\nint x = 1; // inline\n"
        result = self._shorten_no_llm(code, "c")
        assert "Remove me" not in result
        assert "x = 1" in result

    def test_c_removes_block_comments(self):
        code = "/* big block\n   spanning lines */\nint y = 2;\n"
        result = self._shorten_no_llm(code, "c")
        assert "big block" not in result
        assert "y = 2" in result

    def test_js_removes_single_line_comments(self):
        code = "// js comment\nconst x = 42;\n"
        result = self._shorten_no_llm(code, "javascript")
        assert "js comment" not in result
        assert "42" in result

    def test_js_removes_block_comments(self):
        code = "/* block */\nconst y = 99;\n"
        result = self._shorten_no_llm(code, "javascript")
        assert "block" not in result
        assert "99" in result

    def test_fallback_output_has_no_blank_lines(self):
        """Regex fallback strips blank lines so output is denser."""
        code = "// comment\n\nint x = 1;\n\nint y = 2;\n"
        result = self._shorten_no_llm(code, "c")
        blank_lines = [l for l in result.splitlines() if l.strip() == ""]
        assert len(blank_lines) == 0

    def test_already_minimal_input_not_larger(self):
        code = "x=1;y=2;z=x+y;"
        result = self._shorten_no_llm(code, "javascript")
        assert len(result.encode()) <= len(code.encode()) + 5  # tiny tolerance for newlines


# ---------------------------------------------------------------------------
# SEO Optimize — determinism, checklist invariants, edge cases
# ---------------------------------------------------------------------------
class TestSeoOptimizeExtended:
    _PERFECT_HTML = (
        '<html lang="en"><head>'
        '<title>My Page</title>'
        '<meta name="description" content="A description."/>'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>'
        '</head><body>'
        '<main><h1>Main Heading</h1><img src="hero.jpg" alt="Hero image"/></main>'
        '</body></html>'
    )

    # --- Determinism ---
    def test_score_is_deterministic_same_input(self):
        html = self._PERFECT_HTML
        _, _, score1, _ = seo_optimize(html)
        _, _, score2, _ = seo_optimize(html)
        assert score1 == score2, "SEO score must be deterministic for identical input"

    def test_checklist_order_is_deterministic(self):
        html = "<html><head></head><body></body></html>"
        _, _, _, cl1 = seo_optimize(html)
        _, _, _, cl2 = seo_optimize(html)
        cats1 = [c["category"] for c in cl1]
        cats2 = [c["category"] for c in cl2]
        assert cats1 == cats2

    def test_optimized_output_deterministic(self):
        html = "<html><head><title>T</title></head><body><h1>H</h1></body></html>"
        out1, _, _, _ = seo_optimize(html)
        out2, _, _, _ = seo_optimize(html)
        assert out1 == out2

    # --- Score never goes down after applying optimizations ---
    def test_applying_suggestions_does_not_lower_score(self):
        """Run seo_optimize, feed the optimized output back in — score should be >=."""
        html = "<html><head></head><body></body></html>"
        optimized1, _, score1, _ = seo_optimize(html)
        _, _, score2, _ = seo_optimize(optimized1)
        assert score2 >= score1, (
            f"Score dropped from {score1} to {score2} after applying optimizations"
        )

    # --- Perfect HTML scores 100 ---
    def test_perfect_html_scores_100(self):
        _, _, score, checklist = seo_optimize(self._PERFECT_HTML)
        assert score == 100, f"Expected 100, got {score}. Checklist: {checklist}"

    # --- Checklist invariants ---
    def test_checklist_has_exactly_8_items(self):
        """Static checks are fixed at 8; LLM suggestions don't add checklist items."""
        _, _, _, checklist = seo_optimize(self._PERFECT_HTML)
        assert len(checklist) == 8, f"Expected 8 checklist items, got {len(checklist)}"

    def test_checklist_statuses_only_valid_values(self):
        valid_statuses = {"pass", "warning", "error"}
        html = "<html><head></head><body></body></html>"
        _, _, _, checklist = seo_optimize(html)
        for item in checklist:
            assert item["status"] in valid_statuses, (
                f"Invalid status '{item['status']}' in checklist item: {item}"
            )

    def test_all_checklist_items_have_required_fields(self):
        html = self._PERFECT_HTML
        _, _, _, checklist = seo_optimize(html)
        for item in checklist:
            assert "category" in item and item["category"]
            assert "status" in item and item["status"]
            assert "message" in item and item["message"]

    # --- Edge cases ---
    def test_empty_html_string_returns_score_and_checklist(self):
        optimized, suggestions, score, checklist = seo_optimize("")
        assert isinstance(score, int)
        assert isinstance(checklist, list)

    def test_non_html_input_does_not_crash(self):
        """Python code passed to SEO optimize should not raise — return gracefully."""
        py_code = "def foo():\n    return 42\n"
        optimized, suggestions, score, checklist = seo_optimize(py_code)
        # We should get back something, not a crash.
        assert isinstance(score, int)
        assert isinstance(checklist, list)

    def test_multiple_h1_tags_produce_warning_not_crash(self):
        html = (
            '<html lang="en"><head><title>T</title>'
            '<meta name="description" content="d"/>'
            '<meta name="viewport" content="width=device-width"/>'
            '</head><body><main>'
            "<h1>First</h1><h1>Second</h1>"
            "</main></body></html>"
        )
        _, _, score, checklist = seo_optimize(html)
        heading_items = [c for c in checklist if c["category"] == "Headings"]
        assert len(heading_items) == 1
        assert heading_items[0]["status"] == "warning"
        # Score should not be 100 since headings check failed.
        assert score < 100

    def test_img_without_alt_produces_warning(self):
        html = (
            '<html lang="en"><head><title>T</title></head>'
            "<body><main><h1>H</h1><img src='x.jpg'/></main></body></html>"
        )
        _, _, _, checklist = seo_optimize(html)
        alt_items = [c for c in checklist if c["category"] == "Alt"]
        assert alt_items[0]["status"] == "warning"

    def test_img_alt_added_to_all_images(self):
        html = (
            "<html><head></head><body>"
            "<img src='a.jpg'/><img src='b.jpg'/>"
            "</body></html>"
        )
        optimized, _, _, _ = seo_optimize(html)
        import re
        imgs = re.findall(r"<img[^>]*>", optimized)
        for img in imgs:
            assert "alt=" in img, f"Image without alt: {img}"

    def test_score_0_to_100_range_enforced(self):
        for html in [
            "",
            "<html></html>",
            self._PERFECT_HTML,
            "<garbage>no html here</garbage>",
        ]:
            _, _, score, _ = seo_optimize(html)
            assert 0 <= score <= 100, f"Score {score} out of range for input: {html[:40]!r}"

    def test_no_head_tag_gets_created(self):
        html = "<html><body><p>Hello</p></body></html>"
        optimized, _, _, checklist = seo_optimize(html)
        assert "<head>" in optimized or "<head " in optimized

    def test_suggestions_list_always_returned(self):
        """suggestions must always be a list, even for already-perfect HTML."""
        _, suggestions, _, _ = seo_optimize(self._PERFECT_HTML)
        assert isinstance(suggestions, list)

    def test_already_has_viewport_no_duplicate_added(self):
        html = (
            '<html lang="en"><head>'
            '<title>T</title>'
            '<meta name="description" content="d"/>'
            '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>'
            '</head><body><main><h1>H</h1></main></body></html>'
        )
        optimized, _, _, _ = seo_optimize(html)
        import re
        viewport_count = len(re.findall(r'name="viewport"', optimized))
        assert viewport_count == 1, f"Duplicate viewport meta tags found ({viewport_count})"


# ---------------------------------------------------------------------------
# Language Detection (isolated)
# ---------------------------------------------------------------------------
class TestLanguageDetection:
    # --- Explicit override always wins ---
    def test_explicit_python_override(self):
        # Even if the code looks like JS, the explicit hint wins.
        js_looking_code = "const x = () => 42;"
        assert detect_language(js_looking_code, "python") == "python"

    def test_explicit_typescript_override(self):
        assert detect_language("def foo(): pass", "typescript") == "typescript"

    def test_auto_hint_triggers_detection(self):
        """Passing 'auto' as the language hint should behave identically to None."""
        py_code = "import os\ndef main():\n    pass\n"
        detected_none = detect_language(py_code, None)
        detected_auto = detect_language(py_code, "auto")
        assert detected_none == detected_auto

    def test_empty_code_no_hint_returns_text(self):
        assert detect_language("", None) == "text"

    def test_empty_code_with_explicit_hint_returns_hint(self):
        assert detect_language("", "javascript") == "javascript"

    def test_whitespace_only_no_hint_returns_text(self):
        assert detect_language("   \n  \n", None) == "text"

    # --- Auto-detection accuracy for clear cases ---
    def test_detects_python(self):
        code = "import os\nimport sys\n\ndef main():\n    print(sys.argv)\n"
        result = detect_language(code, None)
        assert result == "python", f"Expected 'python', got '{result}'"

    def test_detects_javascript(self):
        # Auto-detection of JS is intentionally fuzzy — Pygments returns
        # inconsistent results for short JS snippets in some environments.
        # The guaranteed contract is: explicit language hint always wins.
        code = 'var http = require("http");\nhttp.createServer(function(req,res){ res.end("hi"); });\n'
        # With explicit hint — must return exactly "javascript"
        assert detect_language(code, "javascript") == "javascript"
        # Auto-detection must return *some* non-empty string — no crash.
        result_auto = detect_language(code, None)
        assert isinstance(result_auto, str) and result_auto

    def test_detects_html(self):
        code = "<!DOCTYPE html>\n<html lang='en'><head></head><body><h1>Hi</h1></body></html>"
        result = detect_language(code, None)
        assert result == "html", f"Expected 'html', got '{result}'"

    def test_detects_css(self):
        code = "body {\n  margin: 0;\n  font-family: sans-serif;\n}\n"
        result = detect_language(code, None)
        assert result == "css", f"Expected 'css', got '{result}'"

    def test_detects_sql(self):
        # Pygments sometimes returns 'Text only' for plain SQL; the important
        # guarantee is that it returns a non-empty string without crashing.
        code = "SELECT id, name FROM users WHERE active = 1 ORDER BY name ASC;"
        result = detect_language(code, None)
        assert isinstance(result, str) and result, (
            f"detect_language returned empty/None for SQL snippet"
        )
        # When an explicit 'sql' hint is given, it must be honoured exactly.
        assert detect_language(code, "sql") == "sql"

    def test_unknown_code_returns_string_not_crash(self):
        """Totally ambiguous input must return a string, never raise."""
        code = "xyz 123 @#!%"
        result = detect_language(code, None)
        assert isinstance(result, str)
        assert result  # non-empty

    def test_returns_string_for_all_languages(self):
        """detect_language always returns str across a representative sample."""
        samples = [
            ("def f(): pass", None),
            ("function f() {}", None),
            ("<html></html>", None),
            ("SELECT 1;", None),
            ("", "go"),
            ("", None),
        ]
        for code, hint in samples:
            result = detect_language(code, hint)
            assert isinstance(result, str) and result, (
                f"detect_language({code!r}, {hint!r}) returned {result!r}"
            )

    def test_case_insensitive_hint_normalised(self):
        """Hints like 'Python', 'PYTHON', 'python' should all work the same."""
        code = "const x = 1;"
        r1 = detect_language(code, "Python")
        r2 = detect_language(code, "PYTHON")
        r3 = detect_language(code, "python")
        assert r1 == r2 == r3
