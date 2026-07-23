import ast
import logging
import re
from typing import Dict, List, Optional, Tuple

import black
import jsbeautifier
from bs4 import BeautifulSoup

logger = logging.getLogger("code_optimizer.tools")


def prettify(code: str, language: Optional[str] = None) -> str:
    """Formats code using deterministic formatters (Black for Python, JSBeautifier for Web)."""
    lang = (language or "").strip().lower()

    if lang in ["python", "py"]:
        try:
            return black.format_str(code, mode=black.Mode())
        except Exception as err:
            logger.warning(f"Black formatting failed: {err}")
            return code

    if lang in ["javascript", "js", "typescript", "ts", "html", "css", "json"]:
        try:
            opts = jsbeautifier.default_options()
            opts.indent_size = 2
            return jsbeautifier.beautify(code, opts)
        except Exception as err:
            logger.warning(f"JSBeautifier formatting failed: {err}")
            return code

    # General indentation cleanup fallback for other languages
    lines = [line.rstrip() for line in code.splitlines()]
    return "\n".join(lines).strip()


def shorten(code: str, language: Optional[str] = None) -> str:
    """Performs AST-based or deterministic comment & whitespace minification."""
    lang = (language or "").strip().lower()

    if lang in ["python", "py"]:
        try:
            tree = ast.parse(code)
            # Remove docstrings from AST
            for node in ast.walk(tree):
                if isinstance(
                    node,
                    (ast.FunctionDef, ast.ClassDef, ast.Module, ast.AsyncFunctionDef),
                ):
                    if (
                        node.body
                        and isinstance(node.body[0], ast.Expr)
                        and isinstance(node.body[0].value, ast.Constant)
                        and isinstance(node.body[0].value.value, str)
                    ):
                        # Remove docstring expr
                        node.body.pop(0)
            return ast.unparse(tree).strip()
        except Exception as err:
            logger.warning(f"AST Python shortening failed: {err}")

    # Deterministic regex minification fallback for C/JS/HTML/CSS
    # Remove single-line comments
    cleaned = re.sub(r"//.*$", "", code, flags=re.MULTILINE)
    # Remove multi-line comments
    cleaned = re.sub(r"/\*[\s\S]*?\*/", "", cleaned)
    # Collapse multiple blank lines
    lines = [line.strip() for line in cleaned.splitlines() if line.strip()]
    return "\n".join(lines)


def seo_optimize(
    html_code: str,
) -> Tuple[str, List[str], int, List[Dict[str, str]]]:
    """Performs static SEO inspection, calculates health score, and generates structured checklist items."""
    suggestions: List[str] = []
    checklist: List[Dict[str, str]] = []
    score_points: int = 0
    total_checks: int = 8

    try:
        soup = BeautifulSoup(html_code, "html.parser")

        # 1. Ensure <html> tag has lang attribute
        html_tag = soup.find("html")
        if not html_tag:
            html_tag = soup.new_tag("html", lang="en")
            soup.insert(0, html_tag)
            suggestions.append("Wrapped HTML document in a valid <html> element.")
            checklist.append(
                {"category": "Lang", "status": "warning", "message": "Added missing <html> element."}
            )
        elif not html_tag.get("lang"):
            html_tag["lang"] = "en"
            suggestions.append("Added 'lang=\"en\"' attribute to the <html> tag.")
            checklist.append(
                {"category": "Lang", "status": "warning", "message": "Added missing 'lang=\"en\"' attribute."}
            )
        else:
            score_points += 1
            checklist.append(
                {"category": "Lang", "status": "pass", "message": f"<html> element contains lang=\"{html_tag.get('lang')}\"."}
            )

        # 2. Ensure <head> tag exists
        head_tag = soup.find("head")
        if not head_tag:
            head_tag = soup.new_tag("head")
            if html_tag:
                html_tag.insert(0, head_tag)
            else:
                soup.insert(0, head_tag)
            suggestions.append("Created missing <head> section.")
            checklist.append(
                {"category": "Head", "status": "warning", "message": "Created missing <head> tag."}
            )
        else:
            score_points += 1
            checklist.append(
                {"category": "Head", "status": "pass", "message": "<head> element present."}
            )

        # 3. Check <title> tag
        title_tag = soup.find("title")
        if not title_tag or not title_tag.string or not title_tag.string.strip():
            new_title = soup.new_tag("title")
            new_title.string = "Optimized Web Page Title"
            head_tag.append(new_title)
            suggestions.append(
                "Added missing <title> tag with descriptive placeholder title."
            )
            checklist.append(
                {"category": "Title", "status": "warning", "message": "Added missing <title> element."}
            )
        else:
            score_points += 1
            checklist.append(
                {"category": "Title", "status": "pass", "message": f"<title> present ('{title_tag.string.strip()}')."}
            )

        # 4. Check <meta name="description">
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if not meta_desc:
            new_desc = soup.new_tag(
                "meta",
                attrs={
                    "name": "description",
                    "content": "Descriptive meta description for search engine discoverability.",
                },
            )
            head_tag.append(new_desc)
            suggestions.append('Added missing <meta name="description"> tag.')
            checklist.append(
                {"category": "Meta", "status": "warning", "message": "Added missing meta description."}
            )
        else:
            score_points += 1
            checklist.append(
                {"category": "Meta", "status": "pass", "message": "Meta description tag present."}
            )

        # 5. Check <meta name="viewport">
        meta_viewport = soup.find("meta", attrs={"name": "viewport"})
        if not meta_viewport:
            new_viewport = soup.new_tag(
                "meta",
                attrs={
                    "name": "viewport",
                    "content": "width=device-width, initial-scale=1.0",
                },
            )
            head_tag.append(new_viewport)
            suggestions.append('Added responsive <meta name="viewport"> tag.')
            checklist.append(
                {"category": "Viewport", "status": "warning", "message": "Added responsive viewport meta tag."}
            )
        else:
            score_points += 1
            checklist.append(
                {"category": "Viewport", "status": "pass", "message": "Viewport meta tag present."}
            )

        # 6. Check <img> tags for alt attributes
        img_tags = soup.find_all("img")
        missing_alt = False
        if img_tags:
            for img in img_tags:
                if not img.get("alt"):
                    img["alt"] = "Image description"
                    missing_alt = True
            if missing_alt:
                suggestions.append("Added descriptive alt attributes to <img> tags.")
                checklist.append(
                    {"category": "Alt", "status": "warning", "message": "Added missing alt attributes to img tags."}
                )
            else:
                score_points += 1
                checklist.append(
                    {"category": "Alt", "status": "pass", "message": "All <img> tags have alt attributes."}
                )
        else:
            score_points += 1
            checklist.append(
                {"category": "Alt", "status": "pass", "message": "No <img> tags present."}
            )

        # 7. Check Heading Hierarchy
        h1_tags = soup.find_all("h1")
        if len(h1_tags) == 0:
            suggestions.append(
                "No <h1> heading found. Add a single primary <h1> heading for search engines."
            )
            checklist.append(
                {"category": "Headings", "status": "warning", "message": "Missing <h1> primary heading."}
            )
        elif len(h1_tags) > 1:
            suggestions.append(
                "Multiple <h1> headings found. Consider using a single <h1> heading per page."
            )
            checklist.append(
                {"category": "Headings", "status": "warning", "message": "Multiple <h1> headings found."}
            )
        else:
            score_points += 1
            checklist.append(
                {"category": "Headings", "status": "pass", "message": "Single <h1> primary heading present."}
            )

        # 8. Check Semantic Elements
        semantic_elements = ["main", "header", "footer", "nav", "article", "section"]
        has_semantic = any(soup.find(elem) for elem in semantic_elements)
        if not has_semantic:
            suggestions.append(
                "Consider replacing generic <div> elements with semantic HTML tags (<main>, <header>, <footer>) for improved accessibility and indexing."
            )
            checklist.append(
                {"category": "Semantic", "status": "warning", "message": "No semantic HTML tags (<main>, <header>, etc.) detected."}
            )
        else:
            score_points += 1
            checklist.append(
                {"category": "Semantic", "status": "pass", "message": "Semantic HTML layout tags detected."}
            )

        final_score = int((score_points / total_checks) * 100)
        optimized_html = soup.prettify()
        return optimized_html, suggestions, final_score, checklist

    except Exception as err:
        logger.error(f"SEO static analysis error: {err}")
        return html_code, [f"Error performing static analysis: {str(err)}"], 0, [
            {"category": "Error", "status": "error", "message": str(err)}
        ]
