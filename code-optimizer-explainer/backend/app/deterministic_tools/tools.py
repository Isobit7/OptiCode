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
    if not lang or lang == "auto":
        from app.llm_interface.client import detect_language
        lang = detect_language(code, language)

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
    """Performs AST-based or deterministic comment & whitespace minification while preserving readability."""
    lang = (language or "").strip().lower()
    if not lang or lang == "auto":
        from app.llm_interface.client import detect_language
        lang = detect_language(code, language)

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
            # ✅ FIX: Preserve line breaks and indentation
            result = ast.unparse(tree).strip()
            return result
        except Exception as err:
            logger.warning(f"AST Python shortening failed: {err}")

    # For non-Python: try LLM-powered shortening first
    try:
        from app.llm_interface.client import _call_model
        system_prompt = (
            "You are a code minifier. Remove all comments, docstrings, and unnecessary blank lines. "
            "Keep proper indentation and line breaks for readability. "
            "Preserve code structure and formatting. "
            "Return ONLY the shortened code, no explanation."
        )
        prompt = f"Language: {lang}\n\nCode:\n```{lang}\n{code}\n```"
        shortened, _ = _call_model(prompt, system_prompt=system_prompt)
        # ✅ FIX: Preserve line breaks when removing code fence
        cleaned_llm = re.sub(r"^```(?:\w+)?\n?", "", shortened.strip(), flags=re.MULTILINE)
        cleaned_llm = re.sub(r"\n?```$", "", cleaned_llm, flags=re.MULTILINE).strip()
        if cleaned_llm:
            return cleaned_llm
    except Exception as llm_err:
        logger.warning(f"LLM shorten fallback failed ({llm_err}), using regex minifier")

    # ✅ FIX: Deterministic regex minification fallback - preserve line breaks
    cleaned = re.sub(r"//.*$", "", code, flags=re.MULTILINE)  # Remove C++ style comments
    cleaned = re.sub(r"/\*[\s\S]*?\*/", "", cleaned)  # Remove block comments
    cleaned = re.sub(r"#.*$", "", cleaned, flags=re.MULTILINE)  # Remove Python comments
    
    # Remove excess blank lines but preserve structure
    lines = []
    prev_blank = False
    for line in cleaned.splitlines():
        stripped = line.strip()
        if stripped:
            lines.append(line)  # Preserve original indentation
            prev_blank = False
        elif not prev_blank:
            lines.append("")  # Keep single blank lines between sections
            prev_blank = True
    
    # ✅ FIX: Join with newlines to preserve formatting
    result = "\n".join(lines).strip()
    return result


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

        # LLM enhancement: add intelligent SEO suggestions beyond static checks
        try:
            import json as _json
            from app.llm_interface.client import _call_model
            llm_system = (
                "You are an SEO expert. Given this HTML, provide exactly 3 specific, actionable SEO suggestions "
                "focusing on content quality, structured data (JSON-LD), and semantic markup improvements. "
                "Do NOT repeat basic meta tag advice. Return ONLY a JSON array of 3 strings."
            )
            llm_prompt = f"HTML:\n```html\n{html_code[:3000]}\n```"
            raw_llm, _ = _call_model(llm_prompt, system_prompt=llm_system)
            json_str = re.sub(r"^```json?\s*|```$", "", raw_llm.strip()).strip()
            extra_suggestions = _json.loads(json_str)
            if isinstance(extra_suggestions, list):
                suggestions.extend([str(s) for s in extra_suggestions[:3]])
        except Exception as llm_err:
            logger.warning(f"LLM SEO enhancement skipped: {llm_err}")

        return optimized_html, suggestions, final_score, checklist

    except Exception as err:
        logger.error(f"SEO static analysis error: {err}")
        return html_code, [f"Error performing static analysis: {str(err)}"], 0, [
            {"category": "Error", "status": "error", "message": str(err)}
        ]
