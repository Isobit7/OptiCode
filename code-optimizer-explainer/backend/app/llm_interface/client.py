import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple

import httpx
from pygments.lexers import guess_lexer

logger = logging.getLogger("code_optimizer.llm")

LLM_API_KEY: Optional[str] = os.getenv("LLM_API_KEY")
LLM_API_URL: str = os.getenv(
    "LLM_API_URL", "https://openrouter.ai/api/v1/chat/completions"
)
DEFAULT_MODELS: str = "poolside/laguna-s-2.1:free,google/gemma-4-31b-it:free"


def detect_language(code: str, language: Optional[str] = None) -> str:
    """Detects programming language from input code or falls back to provided hint."""
    if language and language.strip():
        return language.strip().lower()

    if not code or not code.strip():
        return "text"

    try:
        lexer = guess_lexer(code)
        lexer_name = lexer.name.lower()
        mapping = {
            "python": "python",
            "javascript": "javascript",
            "typescript": "typescript",
            "html": "html",
            "css": "css",
            "c++": "cpp",
            "c": "c",
            "java": "java",
            "go": "go",
            "rust": "rust",
            "php": "php",
            "ruby": "ruby",
            "sql": "sql",
        }
        for key, val in mapping.items():
            if key in lexer_name:
                return val
        return lexer.name
    except Exception as err:
        logger.debug(f"Language detection fallback triggered: {err}")

    if re.search(r"^\s*def\s+\w+|import\s+\w+|from\s+\w+\s+import", code, re.M):
        return "python"
    if re.search(r"^\s*<(!DOCTYPE|html|head|body|div|span)", code, re.M | re.I):
        return "html"
    if re.search(r"const\s+\w+|let\s+\w+|var\s+\w+|function\s+\w+|=>", code):
        return "javascript"

    return "unknown"


def _call_model(prompt: str, system_prompt: Optional[str] = None) -> str:
    """Sends prompt to the configured LLM API provider, trying primary and fallback models."""
    api_key = os.getenv("LLM_API_KEY") or os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        logger.warning("LLM_API_KEY environment variable is missing. Returning stub.")
        return "[STUB] Set LLM_API_KEY in environment to enable real LLM responses."

    headers: Dict[str, str] = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/code-optimizer-explainer",
        "X-Title": "Code Optimizer & Explainer",
    }

    messages: List[Dict[str, str]] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    raw_models = os.getenv("LLM_MODEL_NAME", DEFAULT_MODELS)
    model_candidates = [m.strip() for m in raw_models.split(",") if m.strip()]

    last_error: Optional[str] = None

    for model_name in model_candidates:
        payload: Dict[str, Any] = {
            "model": model_name,
            "messages": messages,
            "temperature": 0.2,
        }

        try:
            logger.info(f"Attempting LLM call with model: {model_name}")
            with httpx.Client(timeout=45.0) as client:
                response = client.post(LLM_API_URL, headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    choices = data.get("choices", [])
                    if choices and len(choices) > 0:
                        logger.info(f"LLM call succeeded with model: {model_name}")
                        return choices[0]["message"]["content"].strip()

                logger.warning(
                    f"Model {model_name} returned HTTP {response.status_code}: {response.text}"
                )
                last_error = (
                    f"Model {model_name} HTTP {response.status_code}: {response.text}"
                )

        except Exception as err:
            logger.warning(f"Failed attempt with model {model_name}: {err}")
            last_error = str(err)

    raise RuntimeError(f"All configured LLM models failed. Last error: {last_error}")


def explain(
    code: str, language: Optional[str] = None, depth: Optional[str] = "beginner"
) -> Tuple[str, str, str]:
    """Generates a plain-language explanation for the provided code with configurable depth."""
    detected = detect_language(code, language)
    depth_level = (depth or "beginner").strip().lower()

    if depth_level == "advanced":
        system_prompt = (
            "You are a principal software architect. Provide a deep, technical explanation "
            "of the provided code. Analyze low-level execution behavior, algorithmic complexity "
            "(Big-O time and space bounds), memory patterns, edge case vulnerabilities, and architectural design."
        )
    elif depth_level == "intermediate":
        system_prompt = (
            "You are a senior developer. Provide a clear, structured technical explanation "
            "of the code. Detail data structures, function calls, control flow, and practical performance considerations."
        )
    else:
        depth_level = "beginner"
        system_prompt = (
            "You are an expert programming mentor. Provide a plain-language, beginner-friendly "
            "explanation of the provided code. Break down key logic step-by-step using clear, intuitive analogies."
        )

    prompt = f"Language: {detected}\nDepth Level: {depth_level}\n\nCode:\n```{detected}\n{code}\n```"

    try:
        explanation = _call_model(prompt, system_prompt=system_prompt)
        return explanation, detected, depth_level
    except Exception as err:
        logger.error(f"Error in explain: {err}")
        return f"Unable to generate explanation: {str(err)}", detected, depth_level


def humanize(
    code: str, language: Optional[str] = None, mode: Optional[str] = "de-ai"
) -> Tuple[str, str, str]:
    """Rewrites AI-sounding or terse code into idiomatic, human-written code with configurable mode."""
    detected = detect_language(code, language)
    mode_used = (mode or "de-ai").strip().lower()

    if mode_used == "simplify":
        system_prompt = (
            "You are a clear-code advocate. Restructure and simplify the code for maximum readability. "
            "Use clear variable names, break complex nested expressions into logical steps, and add explanatory comments."
        )
    elif mode_used == "idiomatic":
        system_prompt = (
            "You are a language specialist. Rewrite the code using modern, idiomatic patterns "
            "and standard style conventions of the language. Preserve exact functionality while employing standard idioms."
        )
    else:
        mode_used = "de-ai"
        system_prompt = (
            "You are an expert code reviewer. Rewrite the following code so it looks natural, "
            "idiomatic, human-written, and readable. Remove AI-generated boilerplate clichés, use clear variable names, "
            "and add helpful comments explaining developer intent. Return ONLY the rewritten code."
        )

    prompt = f"Language: {detected}\nMode: {mode_used}\n\nCode:\n```{detected}\n{code}\n```"

    try:
        humanized = _call_model(prompt, system_prompt=system_prompt)
        cleaned = re.sub(
            r"^```(?:\w+)?\n|```$", "", humanized.strip(), flags=re.MULTILINE
        ).strip()
        return cleaned, detected, mode_used
    except Exception as err:
        logger.error(f"Error in humanize: {err}")
        return f"// Unable to humanize code: {str(err)}\n{code}", detected, mode_used


def alternatives(
    code: str, language: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], str]:
    """Provides 2-3 alternative code implementations labeled with tradeoffs, pros/cons, and complexity."""
    detected = detect_language(code, language)
    system_prompt = (
        "You are a software architect. Provide 2-3 distinct alternative implementations "
        "of the given code (e.g., Functional/Vectorized, Memory-Efficient/Streaming, Standard Idiomatic).\n"
        "Output ONLY valid JSON matching this exact array schema:\n"
        "[\n"
        '  {\n'
        '    "name": "Approach Title",\n'
        '    "code": "alternative code snippet",\n'
        '    "tradeoff": "One-line tradeoff summary",\n'
        '    "pros": ["advantage 1", "advantage 2"],\n'
        '    "cons": ["disadvantage 1"],\n'
        '    "time_complexity": "O(N)",\n'
        '    "space_complexity": "O(1)"\n'
        "  }\n"
        "]"
    )
    prompt = f"Language: {detected}\n\nCode:\n```{detected}\n{code}\n```"

    try:
        raw_output = _call_model(prompt, system_prompt=system_prompt)
        json_str = re.sub(r"^```json\s*|^```\s*|```$", "", raw_output.strip()).strip()

        parsed = json.loads(json_str)
        results: List[Dict[str, Any]] = []
        if isinstance(parsed, list):
            for item in parsed:
                if isinstance(item, dict) and "code" in item:
                    results.append(
                        {
                            "name": str(item.get("name", "Alternative Implementation")),
                            "code": str(item["code"]),
                            "tradeoff": str(item.get("tradeoff", "Alternative approach")),
                            "pros": [str(p) for p in item.get("pros", [])] if isinstance(item.get("pros"), list) else [],
                            "cons": [str(c) for c in item.get("cons", [])] if isinstance(item.get("cons"), list) else [],
                            "time_complexity": str(item.get("time_complexity")) if item.get("time_complexity") else None,
                            "space_complexity": str(item.get("space_complexity")) if item.get("space_complexity") else None,
                        }
                    )
        if results:
            return results, detected

        return [
            {
                "name": "Alternative Implementation",
                "code": raw_output,
                "tradeoff": "Alternative implementation provided by LLM.",
                "pros": ["Provides different approach"],
                "cons": [],
                "time_complexity": None,
                "space_complexity": None,
            }
        ], detected
    except Exception as err:
        logger.error(f"Error in alternatives: {err}")
        return [
            {
                "name": "Original Fallback",
                "code": code,
                "tradeoff": f"Unable to parse alternatives: {str(err)}",
                "pros": [],
                "cons": [str(err)],
                "time_complexity": None,
                "space_complexity": None,
            }
        ], detected
