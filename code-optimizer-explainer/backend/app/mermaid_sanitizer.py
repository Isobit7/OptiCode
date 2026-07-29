"""
Mermaid flowchart sanitizer.

Responsibilities:
1. Escape characters that break Mermaid parsing inside node labels.
2. Prefix reserved-word node IDs so the parser does not choke.
3. Validate the sanitized string with a regex-based structural pre-check
   (headless mermaid.parse() is not available server-side; this catches the
   most common failure classes cheaply without a Node.js round-trip).
4. Expose sanitize() and validate() for use in the flowchart route and in
   unit tests.

Reserved words taken from the Mermaid v10 grammar:
  end, class, subgraph, style, linkStyle, classDef, click, direction,
  graph, flowchart, sequenceDiagram, stateDiagram, gantt, pie, erDiagram,
  gitGraph, journey, mindmap, timeline, quadrantChart, xychart-beta,
  block-beta, packet-beta, architecture-beta
"""

import re
from typing import Tuple

# ---------------------------------------------------------------------------
# Reserved Mermaid node IDs — these cannot appear as bare identifiers.
# ---------------------------------------------------------------------------
_RESERVED = frozenset(
    [
        "end", "class", "subgraph", "style", "linkstyle", "classdef",
        "click", "direction", "graph", "flowchart", "sequencediagram",
        "statediagram", "gantt", "pie", "erdiagram", "gitgraph",
        "journey", "mindmap", "timeline", "quadrantchart",
        "xychart-beta", "block-beta", "packet-beta", "architecture-beta",
    ]
)

# Characters that must be escaped inside Mermaid quoted labels.
_LABEL_ESCAPE_TABLE = str.maketrans(
    {
        '"': "&quot;",
        "<": "&lt;",
        ">": "&gt;",
        "#": "&#35;",
        "|": "&#124;",
    }
)

# Matches a node declaration of the form:  ID[...] / ID{...} / ID(...) / ID>...
_NODE_DECL_RE = re.compile(
    r'(?<!\w)([A-Za-z_][A-Za-z0-9_\-]*)\s*'
    r'(\[|\{|\(|\>)',
    re.MULTILINE,
)

# Matches an edge reference bare word (left of --> or ---)
_EDGE_REF_RE = re.compile(
    r'(?<!\w)([A-Za-z_][A-Za-z0-9_\-]*)\s*(?=-->|---|==>|-.->|===>)',
    re.MULTILINE,
)

# Validates that the block starts with a valid Mermaid graph declaration.
_GRAPH_HEADER_RE = re.compile(
    r'^\s*(graph\s+(TD|TB|BT|RL|LR)|flowchart\s+(TD|TB|BT|RL|LR))',
    re.IGNORECASE | re.MULTILINE,
)

# A valid Mermaid line must contain at least one of these structural elements.
_STRUCTURAL_LINE_RE = re.compile(r'-->|---|==>|subgraph|end\b|\[|\{|\(')


def _prefix_reserved_ids(code: str) -> str:
    """Prefix any bare reserved-word node IDs with `nd_` to avoid parser errors."""

    def _replace_node(m: re.Match) -> str:
        node_id = m.group(1)
        opener = m.group(2)
        if node_id.lower() in _RESERVED:
            return f"nd_{node_id}{opener}"
        return m.group(0)

    def _replace_edge(m: re.Match) -> str:
        node_id = m.group(1)
        if node_id.lower() in _RESERVED:
            return f"nd_{node_id}"
        return m.group(0)

    code = _NODE_DECL_RE.sub(_replace_node, code)
    code = _EDGE_REF_RE.sub(_replace_edge, code)
    return code


def _escape_label_contents(code: str) -> str:
    """Escape special characters found inside node label brackets [ ] { } ( )."""

    def _escape_inside(m: re.Match) -> str:
        opener = m.group(1)
        content = m.group(2)
        closer = m.group(3)
        escaped = content.translate(_LABEL_ESCAPE_TABLE)
        return f"{opener}{escaped}{closer}"

    # Match bracket contents — non-greedy to handle multiple nodes per line.
    label_re = re.compile(r'(\[|\{|\()([^\]\}\)]*?)(\]|\}|\))')
    return label_re.sub(_escape_inside, code)


def sanitize(mermaid_code: str) -> str:
    """
    Apply all sanitization passes to a Mermaid flowchart string.

    Passes (in order):
      1. Reserved-word node ID prefixing.
      2. Special-character escaping inside label brackets.

    Returns the sanitized string ready for Mermaid rendering.
    """
    result = _prefix_reserved_ids(mermaid_code)
    result = _escape_label_contents(result)
    return result


def validate(mermaid_code: str) -> Tuple[bool, str]:
    """
    Lightweight structural validation of a Mermaid flowchart string.

    Returns:
        (True, "")            — passes all checks.
        (False, reason_str)   — fails; reason_str explains why.

    This is intentionally conservative: it catches obviously broken output
    (missing header, no edges, truncated blocks) without false-positives on
    valid but unusual syntax.
    """
    if not mermaid_code or not mermaid_code.strip():
        return False, "Empty Mermaid output."

    if not _GRAPH_HEADER_RE.search(mermaid_code):
        return False, "Missing 'graph TD/LR/...' or 'flowchart TD/LR/...' header."

    lines = [l.strip() for l in mermaid_code.splitlines() if l.strip()]
    structural_lines = [l for l in lines if _STRUCTURAL_LINE_RE.search(l)]
    if len(structural_lines) < 1:
        return False, "No structural Mermaid elements (edges, nodes) found."

    # Unmatched subgraph / end blocks
    subgraph_depth = 0
    for line in lines:
        if re.match(r'^subgraph\b', line, re.IGNORECASE):
            subgraph_depth += 1
        elif re.match(r'^end\b', line, re.IGNORECASE):
            subgraph_depth -= 1
    if subgraph_depth != 0:
        return False, f"Unmatched subgraph/end blocks (depth offset: {subgraph_depth})."

    # Truncation heuristic: last non-empty line ends mid-edge or mid-label
    last_line = lines[-1] if lines else ""
    if last_line.endswith("-->") or last_line.endswith("---"):
        return False, "Mermaid output appears truncated (dangling edge on last line)."

    return True, ""
