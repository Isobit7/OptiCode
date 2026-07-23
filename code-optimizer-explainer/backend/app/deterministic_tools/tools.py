import ast
import logging
import re
from typing import List, Optional, Tuple

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


def seo_optimize(html_code: str) -> Tuple[str, List[str]]:
    """Performs static SEO inspection and automatic fixes on HTML markup using BeautifulSoup."""
    suggestions: List[str] = []

    try:
        soup = BeautifulSoup(html_code, "html.parser")

        # 1. Ensure <html> tag has lang attribute
        html_tag = soup.find("html")
        if not html_tag:
            html_tag = soup.new_tag("html", lang="en")
            soup.insert(0, html_tag)
            suggestions.append("Wrapped HTML document in a valid <html> element.")
        elif not html_tag.get("lang"):
            html_tag["lang"] = "en"
            suggestions.append("Added 'lang=\"en\"' attribute to the <html> tag.")

        # 2. Ensure <head> tag exists
        head_tag = soup.find("head")
        if not head_tag:
            head_tag = soup.new_tag("head")
            if html_tag:
                html_tag.insert(0, head_tag)
            else:
                soup.insert(0, head_tag)
            suggestions.append("Created missing <head> section.")

        # 3. Check <title> tag
        title_tag = soup.find("title")
        if not title_tag or not title_tag.string or not title_tag.string.strip():
            new_title = soup.new_tag("title")
            new_title.string = "Optimized Web Page Title"
            head_tag.append(new_title)
            suggestions.append(
                "Added missing <title> tag with descriptive placeholder title."
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

        # 6. Check <img> tags for alt attributes
        img_tags = soup.find_all("img")
        missing_alt = False
        for img in img_tags:
            if not img.get("alt"):
                img["alt"] = "Image description"
                missing_alt = True
        if missing_alt:
            suggestions.append("Added descriptive alt attributes to <img> tags.")

        # 7. Check Heading Hierarchy
        h1_tags = soup.find_all("h1")
        if len(h1_tags) == 0:
            suggestions.append(
                "No <h1> heading found. Add a single primary <h1> heading for search engines."
            )
        elif len(h1_tags) > 1:
            suggestions.append(
                "Multiple <h1> headings found. Consider using a single <h1> heading per page."
            )

        # 8. Check Semantic Elements
        semantic_elements = ["main", "header", "footer", "nav", "article", "section"]
        has_semantic = any(soup.find(elem) for elem in semantic_elements)
        if not has_semantic:
            suggestions.append(
                "Consider replacing generic <div> elements with semantic HTML tags (<main>, <header>, <footer>) for improved accessibility and indexing."
            )

        optimized_html = soup.prettify()
        return optimized_html, suggestions

    except Exception as err:
        logger.error(f"SEO static analysis error: {err}")
        return html_code, [f"Error performing static analysis: {str(err)}"]
