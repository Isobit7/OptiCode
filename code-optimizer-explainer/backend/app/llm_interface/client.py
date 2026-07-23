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


def explain(code: str, language: Optional[str] = None) -> Tuple[str, str]:
    """Generates a plain-language explanation for the provided code."""
    detected = detect_language(code, language)
    system_prompt = (
        "You are an expert programming mentor. Provide a plain-language, beginner-friendly "
        "explanation of the provided code. Break down key logic step-by-step."
    )
    prompt = f"Language: {detected}\n\nCode:\n```{detected}\n{code}\n```"

    try:
        explanation = _call_model(prompt, system_prompt=system_prompt)
        return explanation, detected
    except Exception as err:
        logger.error(f"Error in explain: {err}")
        return f"Unable to generate explanation: {str(err)}", detected


def humanize(code: str, language: Optional[str] = None) -> Tuple[str, str]:
    """Rewrites AI-sounding or terse code into idiomatic, human-written code with comments."""
    detected = detect_language(code, language)
    system_prompt = (
        "You are an expert code reviewer. Rewrite the following code so it looks natural, "
        "idiomatic, human-written, and readable. Add helpful comments explaining intent, "
        "and use clear variable names. Do NOT change functionality or output behavior. "
        "Return ONLY the rewritten code without surrounding commentary."
    )
    prompt = f"Language: {detected}\n\nCode:\n```{detected}\n{code}\n```"

    try:
        humanized = _call_model(prompt, system_prompt=system_prompt)
        cleaned = re.sub(
            r"^```(?:\w+)?\n|```$", "", humanized.strip(), flags=re.MULTILINE
        ).strip()
        return cleaned, detected
    except Exception as err:
        logger.error(f"Error in humanize: {err}")
        return f"// Unable to humanize code: {str(err)}\n{code}", detected


def alternatives(
    code: str, language: Optional[str] = None
) -> Tuple[List[Dict[str, str]], str]:
    """Provides 2-3 alternative code implementations labeled with one-line tradeoffs."""
    detected = detect_language(code, language)
    system_prompt = (
        "You are a software architect. Provide 2-3 distinct alternative implementations "
        "of the given code. For each alternative, provide the code and a concise, one-line tradeoff summary "
        "(e.g., 'more performant using vectorization', 'fewer external dependencies').\n"
        "Output ONLY valid JSON matching this schema:\n"
        '[\n  {"code": "...", "tradeoff": "..."}\n]'
    )
    prompt = f"Language: {detected}\n\nCode:\n```{detected}\n{code}\n```"

    try:
        raw_output = _call_model(prompt, system_prompt=system_prompt)
        json_str = re.sub(r"^```json\s*|^```\s*|```$", "", raw_output.strip()).strip()

        parsed = json.loads(json_str)
        results: List[Dict[str, str]] = []
        if isinstance(parsed, list):
            for item in parsed:
                if isinstance(item, dict) and "code" in item and "tradeoff" in item:
                    results.append(
                        {
                            "code": str(item["code"]),
                            "tradeoff": str(item["tradeoff"]),
                        }
                    )
        if results:
            return results, detected
        return [
            {
                "code": raw_output,
                "tradeoff": "Alternative implementation provided by LLM.",
            }
        ], detected
    except Exception as err:
        logger.error(f"Error in alternatives: {err}")
        return [
            {
                "code": code,
                "tradeoff": f"Unable to parse alternatives: {str(err)}",
            }
        ], detected
