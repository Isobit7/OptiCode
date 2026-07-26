"""Unit tests for deterministic tools (no LLM or network required)."""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.deterministic_tools.tools import prettify, shorten, seo_optimize


class TestPrettify:
    def test_python_basic_format(self):
        code = "def foo(x):\n  return x+1\n"
        result = prettify(code, "python")
        assert "def foo" in result
        assert result.strip() != ""

    def test_javascript_basic_format(self):
        code = "function foo(x){return x+1}"
        result = prettify(code, "javascript")
        assert "function" in result

    def test_unknown_lang_passthrough(self):
        code = "  some   text  "
        result = prettify(code, "cobol_xyz")
        assert result.strip() != ""

    def test_empty_python(self):
        result = prettify("", "python")
        assert result.strip() == ""

    def test_python_black_normalizes_quotes(self):
        code = "x = 'hello'"
        result = prettify(code, "python")
        # black converts single quotes to double in most cases
        assert "hello" in result


class TestShorten:
    def test_python_removes_docstrings(self):
        code = 'def foo():\n    """This is a docstring."""\n    return 42\n'
        result = shorten(code, "python")
        assert "docstring" not in result
        assert "42" in result

    def test_python_empty_function(self):
        code = "def bar():\n    pass\n"
        result = shorten(code, "python")
        assert "bar" in result

    def test_removes_c_single_line_comments(self):
        code = "// a comment\nint x = 1;"
        result = shorten(code, "c")
        assert "// a comment" not in result

    def test_removes_block_comments(self):
        code = "/* block */\nint y = 2;"
        result = shorten(code, "c")
        assert "block" not in result

    def test_empty_input_python(self):
        result = shorten("", "python")
        assert result.strip() == ""


class TestSeoOptimize:
    def test_adds_missing_title(self):
        html = "<html><head></head><body><h1>Hello</h1></body></html>"
        optimized, suggestions, score, checklist = seo_optimize(html)
        assert "<title>" in optimized

    def test_adds_meta_description(self):
        html = "<html><head><title>Test</title></head><body></body></html>"
        optimized, suggestions, score, checklist = seo_optimize(html)
        assert 'name="description"' in optimized

    def test_adds_lang_attribute(self):
        html = "<html><head></head><body></body></html>"
        optimized, suggestions, score, checklist = seo_optimize(html)
        assert "lang=" in optimized

    def test_score_0_to_100(self):
        html = "<html lang='en'><head><title>T</title><meta name='description' content='d'/><meta name='viewport' content='width=device-width'/></head><body><main><h1>H</h1></main></body></html>"
        _, _, score, _ = seo_optimize(html)
        assert 0 <= score <= 100

    def test_checklist_structure(self):
        html = "<html><head></head><body></body></html>"
        _, _, _, checklist = seo_optimize(html)
        assert len(checklist) > 0
        for item in checklist:
            assert "category" in item
            assert "status" in item
            assert "message" in item

    def test_perfect_html_high_score(self):
        html = """<html lang="en"><head>
            <title>Perfect Page</title>
            <meta name="description" content="A well-optimized page"/>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
        </head><body><main><h1>Main Heading</h1></main></body></html>"""
        _, _, score, _ = seo_optimize(html)
        assert score >= 75

    def test_img_alt_added(self):
        html = "<html><head></head><body><img src='x.jpg'/></body></html>"
        optimized, _, _, _ = seo_optimize(html)
        assert "alt=" in optimized
