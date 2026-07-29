"""
Unit tests for the Mermaid sanitizer (app/mermaid_sanitizer.py).

All tests are fully deterministic — no LLM or network calls.

Coverage:
  - Reserved-word node ID prefixing
  - Label character escaping (", <, >, #, |)
  - Structural validation (header, edges, subgraph balance, truncation)
  - Adversarial / edge-case inputs per the plan spec
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.mermaid_sanitizer import sanitize, validate


# ---------------------------------------------------------------------------
# sanitize() — reserved-word prefixing
# ---------------------------------------------------------------------------
class TestReservedWordPrefixing:
    def test_end_node_id_prefixed_in_declaration(self):
        code = "graph TD\n  Start --> end[End Node]\n"
        result = sanitize(code)
        assert "nd_end" in result
        # The original un-prefixed bare `end` as a node ID should not survive.
        # (The word "end" may still appear inside a label string — that's fine.)

    def test_class_node_id_prefixed(self):
        code = "graph TD\n  A --> class[My Class]\n"
        result = sanitize(code)
        assert "nd_class" in result

    def test_subgraph_keyword_as_node_not_prefixed_in_directive(self):
        """A `subgraph` directive line must NOT get its keyword replaced."""
        code = "graph TD\n  subgraph MySub\n    A --> B\n  end\n"
        result = sanitize(code)
        # The subgraph directive itself should be preserved.
        assert "subgraph MySub" in result

    def test_non_reserved_ids_untouched(self):
        code = "graph TD\n  Start --> Process[Do work]\n  Process --> Finish\n"
        result = sanitize(code)
        assert "Start" in result
        assert "Process" in result
        assert "Finish" in result

    def test_multiple_reserved_ids_all_prefixed(self):
        code = "graph TD\n  end[End] --> class[Class]\n"
        result = sanitize(code)
        assert "nd_end" in result
        assert "nd_class" in result


# ---------------------------------------------------------------------------
# sanitize() — label character escaping
# ---------------------------------------------------------------------------
class TestLabelEscaping:
    def test_double_quote_escaped_in_label(self):
        code = 'graph TD\n  A[Say "hello"]\n'
        result = sanitize(code)
        assert "&quot;" in result
        # Raw unescaped quote inside brackets should be gone.
        # (Allow quotes outside bracket context.)
        bracket_match = result[result.find("["):result.find("]") + 1]
        assert '"' not in bracket_match

    def test_less_than_escaped_in_label(self):
        code = "graph TD\n  A[Value < 10]\n"
        result = sanitize(code)
        assert "&lt;" in result

    def test_greater_than_escaped_in_label(self):
        code = "graph TD\n  A[Value > 10]\n"
        result = sanitize(code)
        assert "&gt;" in result

    def test_hash_escaped_in_label(self):
        code = "graph TD\n  A[Step #1]\n"
        result = sanitize(code)
        assert "&#35;" in result

    def test_pipe_escaped_in_label(self):
        code = "graph TD\n  A[cmd | grep foo]\n"
        result = sanitize(code)
        assert "&#124;" in result

    def test_unicode_label_preserved(self):
        code = "graph TD\n  A[Überprüfung]\n"
        result = sanitize(code)
        assert "Überprüfung" in result

    def test_multiple_special_chars_in_one_label(self):
        code = 'graph TD\n  A[a < b & "c" | d]\n'
        result = sanitize(code)
        assert "&lt;" in result
        assert "&quot;" in result
        assert "&#124;" in result


# ---------------------------------------------------------------------------
# validate() — structural checks
# ---------------------------------------------------------------------------
class TestValidate:
    def test_valid_simple_flowchart(self):
        code = (
            "graph TD\n"
            "  Start([Start]) --> Check{Valid?}\n"
            "  Check -- Yes --> Done[Done]\n"
            "  Check -- No --> Error[Error]\n"
        )
        ok, reason = validate(code)
        assert ok is True
        assert reason == ""

    def test_valid_flowchart_keyword(self):
        code = (
            "flowchart TD\n"
            "  A --> B\n"
        )
        ok, _ = validate(code)
        assert ok is True

    def test_missing_header_fails(self):
        code = "  Start --> Process\n  Process --> End\n"
        ok, reason = validate(code)
        assert ok is False
        assert "header" in reason.lower()

    def test_empty_string_fails(self):
        ok, reason = validate("")
        assert ok is False
        assert "empty" in reason.lower()

    def test_whitespace_only_fails(self):
        ok, reason = validate("   \n  \n")
        assert ok is False

    def test_no_structural_elements_fails(self):
        code = "graph TD\n  Just a comment line\n"
        ok, reason = validate(code)
        assert ok is False

    def test_unmatched_subgraph_fails(self):
        code = (
            "graph TD\n"
            "  subgraph Group1\n"
            "    A --> B\n"
            # missing `end`
        )
        ok, reason = validate(code)
        assert ok is False
        assert "subgraph" in reason.lower()

    def test_matched_subgraph_passes(self):
        code = (
            "graph TD\n"
            "  subgraph Group1\n"
            "    A --> B\n"
            "  end\n"
            "  Group1 --> C\n"
        )
        ok, reason = validate(code)
        assert ok is True

    def test_dangling_edge_on_last_line_fails(self):
        code = "graph TD\n  A --> B\n  B -->"
        ok, reason = validate(code)
        assert ok is False
        assert "truncated" in reason.lower()

    def test_deeply_nested_conditionals_passes(self):
        """A wide flowchart (>15 branches) should validate without truncation errors."""
        edges = "\n".join(
            f"  Check{i}{{Branch {i}?}} -- Yes --> Node{i}[Process {i}]"
            for i in range(16)
        )
        code = f"graph TD\n  Start --> Check0\n{edges}\n"
        ok, _ = validate(code)
        assert ok is True


# ---------------------------------------------------------------------------
# Adversarial inputs from the plan spec
# ---------------------------------------------------------------------------
class TestAdversarialInputs:
    def test_code_containing_literal_quotes_survives(self):
        """A code snippet with printf("hello") should not crash the sanitizer."""
        code = 'graph TD\n  A[printf("hello, world")]\n'
        result = sanitize(code)
        assert "graph TD" in result
        ok, _ = validate(result)
        # After escaping, the result should structurally validate.
        assert ok is True

    def test_code_with_pipe_in_label(self):
        code = "graph TD\n  A[cat file | grep foo] --> B[Output]\n"
        result = sanitize(code)
        ok, _ = validate(result)
        assert ok is True

    def test_fallback_graph_always_valid(self):
        """The hardcoded fallback returned on total failure must always validate."""
        fallback = "graph TD\n  Start([Start Execution]) --> Execute[Execute Code Snippet] --> End([Complete])"
        result = sanitize(fallback)
        ok, reason = validate(result)
        assert ok is True, reason
