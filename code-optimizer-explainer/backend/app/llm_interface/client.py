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
DEFAULT_MODELS: str = (
    "meta-llama/llama-3.3-70b-instruct:free,"
    "deepseek/deepseek-r1:free,"
    "qwen/qwen-2.5-coder-32b-instruct:free,"
    "google/gemma-2-9b-it:free,"
    "mistralai/mistral-7b-instruct:free,"
    "poolside/laguna-s-2.1:free"
)


def detect_language(code: str, language: Optional[str] = None) -> str:
    """Detects programming language from input code or falls back to provided hint."""
    if language and language.strip() and language.strip().lower() != "auto":
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


def _call_model(prompt: str, system_prompt: Optional[str] = None) -> Tuple[str, str]:
    """Sends prompt to configured LLM providers (Groq first for <500ms speed, Google Gemini 2nd, OpenRouter 3rd)."""
    groq_key = os.getenv("GROQ_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    openrouter_key = os.getenv("LLM_API_KEY") or os.getenv("OPENROUTER_API_KEY")

    # Record token estimate into the observability bag (best-effort; never raises)
    try:
        from app.observability import record_llm_call as _obs_record
        _obs_record_fn = _obs_record
    except Exception:
        _obs_record_fn = None

    if not groq_key and not gemini_key and not openrouter_key:
        logger.warning("No LLM API keys configured. Returning stub.")
        return "[STUB] Set GROQ_API_KEY, GEMINI_API_KEY, or LLM_API_KEY in environment to enable real LLM responses.", "stub/none", "stub/none"

    messages: List[Dict[str, str]] = []

    # Soft token size guard (~4 chars per token estimate)
    estimated_tokens = len(prompt) // 4
    if estimated_tokens > 6000:
        raise RuntimeError(f"Input too large: ~{estimated_tokens} tokens estimated (soft limit 6000). Please reduce input size.")

    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    last_error: Optional[str] = None

    # Provider 1: Try Groq API (Ultra-Fast <500ms LPU Inference)
    if groq_key:
        groq_url = "https://api.groq.com/openai/v1/chat/completions"
        groq_headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json",
        }
        raw_groq_models = os.getenv(
            "GROQ_MODELS",
            "llama-3.3-70b-versatile,deepseek-r1-distill-llama-70b,llama3-8b-8192",
        )
        groq_models = [m.strip() for m in raw_groq_models.split(",") if m.strip()]

        for g_model in groq_models:
            payload = {
                "model": g_model,
                "messages": messages,
                "temperature": 0.2,
            }
            try:
                logger.info(f"Attempting Groq API call with model: {g_model}")
                with httpx.Client(timeout=15.0) as client:
                    response = client.post(groq_url, headers=groq_headers, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        choices = data.get("choices", [])
                        if choices and len(choices) > 0:
                            logger.info(f"Groq API call succeeded with model: {g_model}")
                            provider_id = f"groq/{g_model}"
                            if _obs_record_fn:
                                try:
                                    _obs_record_fn(provider_id, len(prompt))
                                except Exception:
                                    pass
                            return (choices[0]["message"]["content"].strip(), provider_id)
                    logger.warning(
                        f"Groq model {g_model} returned HTTP {response.status_code}: {response.text}"
                    )
                    last_error = f"Groq {g_model} HTTP {response.status_code}: {response.text}"
            except Exception as err:
                logger.warning(f"Failed attempt with Groq model {g_model}: {err}")
                last_error = str(err)

    # Provider 2: Try Google Gemini API (Google AI Studio)
    if gemini_key:
        raw_gemini_models = os.getenv("GEMINI_MODELS", "gemini-2.5-flash,gemini-1.5-flash")
        gemini_models = [m.strip() for m in raw_gemini_models.split(",") if m.strip()]

        full_user_text = prompt
        if system_prompt:
            full_user_text = f"System Instruction: {system_prompt}\n\nUser Prompt: {prompt}"

        for g_model in gemini_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": full_user_text}]}],
                "generationConfig": {"temperature": 0.2},
            }
            try:
                logger.info(f"Attempting Gemini API call with model: {g_model}")
                with httpx.Client(timeout=15.0) as client:
                    response = client.post(url, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        candidates = data.get("candidates", [])
                        if candidates and len(candidates) > 0:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts and "text" in parts[0]:
                                logger.info(f"Gemini API call succeeded with model: {g_model}")
                                provider_id = f"gemini/{g_model}"
                                if _obs_record_fn:
                                    try:
                                        _obs_record_fn(provider_id, len(prompt))
                                    except Exception:
                                        pass
                                return (parts[0]["text"].strip(), provider_id)
                    logger.warning(
                        f"Gemini model {g_model} returned HTTP {response.status_code}: {response.text}"
                    )
                    last_error = f"Gemini {g_model} HTTP {response.status_code}: {response.text}"
            except Exception as err:
                logger.warning(f"Failed attempt with Gemini model {g_model}: {err}")
                last_error = str(err)

    # Provider 3: Fallback to OpenRouter Multi-Model Pool
    if openrouter_key:
        headers = {
            "Authorization": f"Bearer {openrouter_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/code-optimizer-explainer",
            "X-Title": "Code Optimizer & Explainer",
        }
        raw_models = os.getenv("LLM_MODEL_NAME", DEFAULT_MODELS)
        model_candidates = [m.strip() for m in raw_models.split(",") if m.strip()]

        for model_name in model_candidates:
            payload = {
                "model": model_name,
                "messages": messages,
                "temperature": 0.2,
            }
            try:
                logger.info(f"Attempting OpenRouter LLM call with model: {model_name}")
                with httpx.Client(timeout=30.0) as client:
                    response = client.post(LLM_API_URL, headers=headers, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        choices = data.get("choices", [])
                        if choices and len(choices) > 0:
                            logger.info(f"OpenRouter LLM call succeeded with model: {model_name}")
                            provider_id = f"openrouter/{model_name}"
                            if _obs_record_fn:
                                try:
                                    _obs_record_fn(provider_id, len(prompt))
                                except Exception:
                                    pass
                            return (choices[0]["message"]["content"].strip(), provider_id)

                    logger.warning(
                        f"OpenRouter model {model_name} returned HTTP {response.status_code}: {response.text}"
                    )
                    last_error = f"OpenRouter model {model_name} HTTP {response.status_code}: {response.text}"
            except Exception as err:
                logger.warning(f"Failed attempt with OpenRouter model {model_name}: {err}")
                last_error = str(err)

    raise RuntimeError(f"All configured LLM providers failed. Last error: {last_error}")


def _validate_explain_output(text: str) -> bool:
    """Returns True if the explanation contains at least one Markdown section heading."""
    return bool(re.search(r"^#{1,3}\s+\S", text, re.MULTILINE))


def explain(
    code: str, language: Optional[str] = None, depth: Optional[str] = "beginner"
) -> Tuple[str, str, str]:
    """Generates a plain-language explanation with configurable depth.

    Parse-check: output must contain at least one Markdown heading (###).
    On failure, retries once with a reinforced format instruction.
    """
    detected = detect_language(code, language)
    depth_level = (depth or "beginner").strip().lower()

    _DEPTH_PROMPTS = {
        "advanced": (
            "You are a principal software architect. Provide a deep, technical explanation "
            "of the provided code. Analyze low-level execution behavior, algorithmic complexity "
            "(Big-O time and space bounds), memory patterns, edge case vulnerabilities, and architectural design. "
            "Format your response using clean Markdown with section headings (###), bullet points (-), bold key terms, and code snippets. "
            "Your response MUST include at least three ### section headings."
        ),
        "intermediate": (
            "You are a senior developer. Provide a clear, structured technical explanation "
            "of the code. Detail data structures, function calls, control flow, and practical performance considerations. "
            "Format your response using clean Markdown with section headings (###), bullet points (-), bold key terms, and code snippets. "
            "Your response MUST include at least two ### section headings."
        ),
        "beginner": (
            "You are an expert programming mentor. Provide a plain-language, beginner-friendly "
            "explanation of the provided code. Break down key logic step-by-step using clear, intuitive analogies. "
            "Format your response using clean Markdown with section headings (###), bullet points (-), bold key terms, and code snippets. "
            "Your response MUST include at least one ### section heading such as '### What This Code Does'."
        ),
    }
    if depth_level not in _DEPTH_PROMPTS:
        depth_level = "beginner"
    system_prompt = _DEPTH_PROMPTS[depth_level]

    prompt = f"Language: {detected}\nDepth Level: {depth_level}\n\nCode:\n```{detected}\n{code}\n```"

    try:
        explanation, provider = _call_model(prompt, system_prompt=system_prompt)
        logger.info(f"[explain] LLM provider used: {provider}")

        if not _validate_explain_output(explanation):
            logger.warning("[explain] Output missing Markdown headings — retrying with format reminder.")
            try:
                from app.observability import record_retry, record_validation
                record_retry()
                record_validation(False)
            except Exception:
                pass
            retry_system = system_prompt + (
                "\n\nCRITICAL: Your previous response lacked section headings. "
                "You MUST structure your answer with ### headings. Do not return a single unbroken paragraph."
            )
            explanation, provider = _call_model(prompt, system_prompt=retry_system)
            logger.info(f"[explain] Retry provider: {provider}")

        return explanation, detected, depth_level
    except Exception as err:
        logger.error(f"Error in explain: {err}")
        return f"Unable to generate explanation: {str(err)}", detected, depth_level


def humanize(
    code: str, language: Optional[str] = None, mode: Optional[str] = "de-ai"
) -> Tuple[str, str, str]:
    """Rewrites AI-sounding or terse code into idiomatic, human-written code.

    Post-processing checks:
      - Output must differ from input (similarity guard — proves it actually rewrote).
      - For Python, output is parse-checked via ast.parse; if invalid, falls back to raw output.
    """
    detected = detect_language(code, language)
    mode_used = (mode or "de-ai").strip().lower()

    if mode_used == "simplify":
        system_prompt = (
            "You are a clear-code advocate. Restructure and simplify the code for maximum readability. "
            "Use clear variable names, break complex nested expressions into logical steps, and add explanatory comments. "
            "Return ONLY the rewritten code — no prose explanation before or after."
        )
    elif mode_used == "idiomatic":
        system_prompt = (
            "You are a language specialist. Rewrite the code using modern, idiomatic patterns "
            "and standard style conventions of the language. Preserve exact functionality while employing standard idioms. "
            "Return ONLY the rewritten code — no prose explanation before or after."
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
        humanized, provider = _call_model(prompt, system_prompt=system_prompt)
        logger.info(f"[humanize] LLM provider used: {provider}")
        cleaned = re.sub(
            r"^```(?:\w+)?\n|```$", "", humanized.strip(), flags=re.MULTILINE
        ).strip()

        # Similarity guard: if output is identical to input (after strip), the LLM just
        # echoed — retry once with a more forceful instruction.
        if cleaned.strip() == code.strip():
            logger.warning("[humanize] Output identical to input — retrying with forceful rewrite instruction.")
            try:
                from app.observability import record_retry, record_validation
                record_retry()
                record_validation(False)
            except Exception:
                pass
            retry_system = system_prompt + (
                "\n\nCRITICAL: Your previous output was identical to the input. "
                "You MUST meaningfully rewrite the code. Change variable names, add comments, "
                "restructure expressions. The output must be visibly different from the input."
            )
            humanized2, _ = _call_model(prompt, system_prompt=retry_system)
            cleaned = re.sub(
                r"^```(?:\w+)?\n|```$", "", humanized2.strip(), flags=re.MULTILINE
            ).strip()

        # Python parse-check: if output is not valid Python, fall back to original output
        # rather than silently returning broken code.
        if detected == "python" and cleaned:
            import ast as _ast
            try:
                _ast.parse(cleaned)
            except SyntaxError as syn_err:
                logger.warning(f"[humanize] Humanized Python output has syntax error ({syn_err}). Returning pre-cleaned LLM output.")
                # Strip fences from the original (unfixed) output and return that — still
                # better than a guaranteed-broken cleaned version.
                cleaned = re.sub(
                    r"^```(?:\w+)?\n|```$", "", humanized.strip(), flags=re.MULTILINE
                ).strip()

        return cleaned, detected, mode_used
    except Exception as err:
        logger.error(f"Error in humanize: {err}")
        return f"// Unable to humanize code: {str(err)}\n{code}", detected, mode_used


def _validate_alternatives_item(item: Dict[str, Any]) -> bool:
    """Returns True if an alternatives item has required fields with non-empty values."""
    return (
        isinstance(item, dict)
        and bool(item.get("code"))
        and bool(item.get("tradeoff"))
        and (bool(item.get("time_complexity")) or bool(item.get("space_complexity")))
    )


def alternatives(
    code: str, language: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], str]:
    """Provides 2-3 alternative code implementations with tradeoffs, pros/cons, and complexity.

    Schema enforcement:
      - Retries once if JSON parse fails or output doesn't pass schema validation.
      - Each alternative must have: code, tradeoff, and at least one complexity field.
    """
    detected = detect_language(code, language)

    _BASE_SYSTEM = (
        "You are a software architect. Provide 2-3 distinct alternative implementations "
        "of the given code (e.g., Functional/Vectorized, Memory-Efficient/Streaming, Standard Idiomatic).\n"
        "Output ONLY valid JSON matching this exact array schema — no prose before or after the JSON:\n"
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
        "]\n"
        "Every object MUST include 'code', 'tradeoff', 'time_complexity', and 'space_complexity'."
    )

    _RETRY_SYSTEM = (
        _BASE_SYSTEM
        + "\n\nCRITICAL: Your previous response failed schema validation. Common problems:\n"
        "- Response contained prose text outside the JSON array.\n"
        "- Missing 'time_complexity' or 'space_complexity' fields.\n"
        "- Invalid JSON (trailing comma, unquoted keys, etc.).\n"
        "Output ONLY the raw JSON array starting with '[' and ending with ']'. Nothing else."
    )

    prompt = f"Language: {detected}\n\nCode:\n```{detected}\n{code}\n```"

    def _parse_and_validate(raw: str) -> Optional[List[Dict[str, Any]]]:
        json_str = re.sub(r"^```json\s*|^```\s*|```$", "", raw.strip(), flags=re.MULTILINE).strip()
        # Find JSON array even when surrounded by prose
        arr_match = re.search(r"\[[\s\S]*\]", json_str)
        if arr_match:
            json_str = arr_match.group(0)
        parsed = json.loads(json_str)
        if not isinstance(parsed, list) or len(parsed) == 0:
            return None
        valid_items = [item for item in parsed if isinstance(item, dict) and "code" in item]
        if not valid_items:
            return None
        return valid_items

    def _normalise(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [
            {
                "name": str(item.get("name", "Alternative Implementation")),
                "code": str(item["code"]),
                "tradeoff": str(item.get("tradeoff", "Alternative approach")),
                "pros": [str(p) for p in item.get("pros", [])] if isinstance(item.get("pros"), list) else [],
                "cons": [str(c) for c in item.get("cons", [])] if isinstance(item.get("cons"), list) else [],
                "time_complexity": str(item.get("time_complexity")) if item.get("time_complexity") else None,
                "space_complexity": str(item.get("space_complexity")) if item.get("space_complexity") else None,
            }
            for item in items
        ]

    try:
        raw_output, provider = _call_model(prompt, system_prompt=_BASE_SYSTEM)
        logger.info(f"[alternatives] LLM provider used: {provider}")

        parsed_items = None
        try:
            parsed_items = _parse_and_validate(raw_output)
        except (json.JSONDecodeError, ValueError) as parse_err:
            logger.warning(f"[alternatives] JSON parse failed ({parse_err}) — retrying.")

        schema_ok = parsed_items is not None and any(_validate_alternatives_item(i) for i in parsed_items)

        if not schema_ok:
            logger.warning("[alternatives] Schema validation failed — retrying with corrective prompt.")
            try:
                from app.observability import record_retry, record_validation
                record_retry()
                record_validation(False)
            except Exception:
                pass
            raw_output, retry_provider = _call_model(prompt, system_prompt=_RETRY_SYSTEM)
            logger.info(f"[alternatives] Retry provider: {retry_provider}")
            try:
                parsed_items = _parse_and_validate(raw_output)
            except (json.JSONDecodeError, ValueError):
                parsed_items = None

        if parsed_items:
            return _normalise(parsed_items), detected

        # Final fallback: return raw output wrapped as a single item
        return [
            {
                "name": "Alternative Implementation",
                "code": raw_output,
                "tradeoff": "Alternative implementation provided by LLM (schema validation failed).",
                "pros": ["Provides different approach"],
                "cons": ["Could not parse structured response"],
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


_SEVERITY_ENUM = frozenset(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"])
_SECURITY_REQUIRED_KEYS = frozenset(["grade", "score", "vulnerabilities", "summary"])


def _validate_security_response(parsed: Any, code_line_count: int) -> Tuple[bool, str]:
    """Validates the parsed LLM security audit JSON against the required schema."""
    if not isinstance(parsed, dict):
        return False, "Response is not a JSON object."
    missing = _SECURITY_REQUIRED_KEYS - set(parsed.keys())
    if missing:
        return False, f"Missing required keys: {missing}"
    if not isinstance(parsed.get("vulnerabilities"), list):
        return False, "'vulnerabilities' must be a JSON array."
    for i, vuln in enumerate(parsed["vulnerabilities"]):
        if not isinstance(vuln, dict):
            return False, f"vulnerabilities[{i}] is not an object."
        sev = str(vuln.get("severity", "")).upper()
        if sev and sev not in _SEVERITY_ENUM:
            return False, f"vulnerabilities[{i}].severity '{sev}' not in {_SEVERITY_ENUM}."
        ln = vuln.get("line_number")
        if ln is not None:
            try:
                ln_int = int(ln)
                if not (1 <= ln_int <= max(code_line_count, 1)):
                    # Clamp rather than reject — LLMs regularly hallucinate line numbers.
                    vuln["line_number"] = max(1, min(ln_int, code_line_count))
            except (ValueError, TypeError):
                vuln["line_number"] = None
    return True, ""


def security_audit(
    code: str, language: Optional[str] = None
) -> Tuple[Dict[str, Any], str]:
    """Scans code for hardcoded secrets, OWASP vulnerabilities, and generates a security scorecard.

    Schema enforcement:
      - Required top-level keys validated; retry on failure.
      - Severity values normalised against enum; invalid values clamped.
      - line_number values clamped to actual file bounds (1..N).
    """
    detected = detect_language(code, language)
    code_line_count = len(code.splitlines()) or 1

    # 1. Deterministic secret scanner
    secret_patterns = [
        (r"(?i)(api[_-]?key|secret|token|password|auth_token)\s*[:=]\s*[\"']([A-Za-z0-9_\-\.]{8,})[\"']", "Hardcoded API Key / Secret"),
        (r"(?i)bearer\s+[A-Za-z0-9_\-\.]{20,}", "Hardcoded Bearer Token"),
        (r"AKIA[0-9A-Z]{16}", "AWS Access Key ID"),
        (r"ghp_[A-Za-z0-9_]{36}", "GitHub Personal Access Token"),
        (r"sk-[A-Za-z0-9]{32,}", "Secret Key Pattern"),
        (r"postgres://[^\s]+", "PostgreSQL Connection String with Credentials"),
        (r"mongodb(\+srv)?://[^\s]+", "MongoDB Connection String with Credentials"),
    ]

    detected_leaks: List[Dict[str, Any]] = []
    sanitized_code = code
    secrets_found = 0

    for pattern, title in secret_patterns:
        matches = list(re.finditer(pattern, sanitized_code))
        for match in matches:
            secrets_found += 1
            full_match = match.group(0)
            line_no = sanitized_code[:match.start()].count("\n") + 1
            detected_leaks.append({
                "severity": "CRITICAL",
                "category": "Secret Leak",
                "title": title,
                "description": f"Hardcoded credential or secret key exposed on line {line_no}.",
                "line_number": line_no,
                "recommendation": "Move secret to environment variables or secret manager (e.g. process.env / os.getenv)."
            })
            replacement = re.sub(r"[\"'](.*?)[\"']", '"YOUR_ENV_SECRET_KEY"', full_match)
            # If no quotes were found in the match, replace the whole matched value directly
            if replacement == full_match:
                replacement = '"YOUR_ENV_SECRET_KEY"'
            sanitized_code = sanitized_code.replace(full_match, replacement)

    # 2. LLM Security Audit
    _BASE_SYSTEM = (
        "You are an expert OWASP Application Security Auditor. Analyze the provided code for security flaws "
        "(SQL Injection, XSS, insecure deserialization, unvalidated input, hardcoded credentials, buffer overflow).\n"
        "Output ONLY valid JSON matching this exact structure — no prose before or after:\n"
        "{\n"
        '  "grade": "A",\n'
        '  "score": 85,\n'
        '  "vulnerabilities": [\n'
        '    {\n'
        '      "severity": "HIGH",\n'
        '      "category": "OWASP Top 10",\n'
        '      "title": "SQL Injection Vulnerability",\n'
        '      "description": "Raw string formatting used in SQL query.",\n'
        '      "line_number": 12,\n'
        '      "recommendation": "Use parameterized queries or ORM bindings."\n'
        '    }\n'
        '  ],\n'
        '  "summary": "Overall security assessment summary text."\n'
        "}\n"
        "Rules:\n"
        "- 'grade' must be one of: A+, A, B, C, D, F\n"
        "- 'score' must be an integer 0-100\n"
        f"- 'severity' for each vulnerability must be one of: {', '.join(sorted(_SEVERITY_ENUM))}\n"
        "- 'line_number' must be an integer or null\n"
        "- All four top-level keys (grade, score, vulnerabilities, summary) are required"
    )

    _RETRY_SYSTEM = (
        _BASE_SYSTEM
        + "\n\nCRITICAL: Your previous response failed schema validation. "
        "Output ONLY the raw JSON object starting with '{' and ending with '}'. Nothing else."
    )

    prompt = f"Language: {detected}\n\nCode:\n```{detected}\n{code}\n```"

    def _try_parse(raw: str) -> Optional[Any]:
        json_str = re.sub(r"^```json\s*|^```\s*|```$", "", raw.strip(), flags=re.MULTILINE).strip()
        # Find outermost JSON object even when surrounded by prose
        obj_match = re.search(r"\{[\s\S]*\}", json_str)
        if obj_match:
            json_str = obj_match.group(0)
        return json.loads(json_str)

    try:
        raw_output, provider = _call_model(prompt, system_prompt=_BASE_SYSTEM)
        logger.info(f"[security_audit] LLM provider used: {provider}")

        parsed = None
        schema_valid = False
        try:
            parsed = _try_parse(raw_output)
            schema_valid, schema_err = _validate_security_response(parsed, code_line_count)
        except (json.JSONDecodeError, ValueError) as parse_err:
            schema_err = str(parse_err)

        if not schema_valid:
            logger.warning(f"[security_audit] Schema validation failed ({schema_err}) — retrying.")
            try:
                from app.observability import record_retry, record_validation
                record_retry()
                record_validation(False)
            except Exception:
                pass
            raw_output, retry_provider = _call_model(prompt, system_prompt=_RETRY_SYSTEM)
            logger.info(f"[security_audit] Retry provider: {retry_provider}")
            try:
                parsed = _try_parse(raw_output)
                schema_valid, schema_err = _validate_security_response(parsed, code_line_count)
                if not schema_valid:
                    logger.error(f"[security_audit] Retry also failed schema validation: {schema_err}")
            except (json.JSONDecodeError, ValueError) as e:
                logger.error(f"[security_audit] Retry JSON parse failed: {e}")
                parsed = None

        if parsed:
            all_vulns = detected_leaks + [
                {
                    "severity": str(v.get("severity", "MEDIUM")).upper(),
                    "category": str(v.get("category", "Security Concern")),
                    "title": str(v.get("title", "Potential Security Issue")),
                    "description": str(v.get("description", "Vulnerability detected.")),
                    "line_number": v.get("line_number"),
                    "recommendation": str(v.get("recommendation", "Review and sanitize input.")),
                }
                for v in parsed.get("vulnerabilities", [])
                if isinstance(v, dict)
            ]

            score = int(parsed.get("score", 90 if secrets_found == 0 else 45))
            score = max(0, min(100, score))
            if secrets_found > 0:
                score = min(score, 50)

            grade = "A+" if score >= 95 else "A" if score >= 85 else "B" if score >= 70 else "C" if score >= 55 else "F"

            return {
                "grade": grade,
                "score": score,
                "secrets_found": secrets_found,
                "vulnerabilities": all_vulns,
                "sanitized_code": sanitized_code,
                "summary": str(parsed.get("summary", f"Security audit completed. Found {len(all_vulns)} potential risk items.")),
            }, detected

        # Deterministic-only fallback (LLM/schema both failed)
        raise RuntimeError("LLM security audit schema validation failed after retry.")

    except Exception as err:
        logger.error(f"Error in security_audit LLM call: {err}")
        grade = "F" if secrets_found > 0 else "B"
        return {
            "grade": grade,
            "score": 40 if secrets_found > 0 else 80,
            "secrets_found": secrets_found,
            "vulnerabilities": detected_leaks,
            "sanitized_code": sanitized_code,
            "summary": f"Deterministic scan completed ({secrets_found} secret leaks detected). LLM security scan fallback.",
        }, detected


_TRANSLATION_CAVEATS: Dict[str, str] = {
    "python→go": (
        "Pay special attention to: goroutines vs Python threads, Go error-return idiom vs exceptions, "
        "struct methods vs Python classes, explicit nil vs None, and Go's lack of list comprehensions."
    ),
    "python→rust": (
        "Pay special attention to: ownership/borrowing vs garbage collection, Result/Option vs exceptions, "
        "lifetimes, trait-based polymorphism vs Python duck typing, and immutability by default."
    ),
    "javascript→rust": (
        "Pay special attention to: ownership/borrowing model, async/await differences, "
        "Rust's type system vs JS dynamic typing, and struct/impl vs JS prototype chains."
    ),
    "python→typescript": (
        "Pay special attention to: explicit type annotations, interface vs class, "
        "async/await patterns, None vs null/undefined, and module system (ESM vs CommonJS)."
    ),
    "javascript→python": (
        "Pay special attention to: list comprehensions vs map/filter, async patterns, "
        "None vs null/undefined, Python's indentation-based blocks vs braces, and module imports."
    ),
    "go→python": (
        "Pay special attention to: goroutine concurrency vs threading/asyncio, "
        "Go error returns vs Python exceptions, interfaces vs duck typing, and Go structs vs Python classes."
    ),
}


def translate(
    code: str, source_language: Optional[str] = None, target_language: str = "TypeScript"
) -> Tuple[str, List[str], str]:
    """Translates source code to target programming language while enforcing idiomatic conventions.

    Enhancements:
      - Injects language-pair-specific caveats for known gotcha pairs.
      - Enforces non-empty notes list; falls back to a default note if LLM omits them.
    """
    src = detect_language(code, source_language)
    target = target_language.strip()

    # Look up caveats for this pair (case-insensitive)
    pair_key = f"{src.lower()}→{target.lower()}"
    caveat = _TRANSLATION_CAVEATS.get(pair_key, "")
    caveat_instruction = (
        f"\n\nLanguage-specific caveats for {src}→{target} translation:\n{caveat}"
        if caveat
        else ""
    )

    system_prompt = (
        f"You are a polyglot lead software engineer. Translate the provided {src} code to {target}.\n"
        f"1. Enforce native idioms and standard style conventions of {target}.\n"
        f"2. Return ONLY the translated code inside standard Markdown code blocks ```{target.lower()}\n...\n```.\n"
        f"3. After the code block, list 2-3 key conversion notes starting with `- Note: `.\n"
        f"   The notes section is REQUIRED — do not omit it."
        f"{caveat_instruction}"
    )
    prompt = f"Source Language: {src}\nTarget Language: {target}\n\nOriginal Code:\n```{src}\n{code}\n```"

    try:
        raw_output, provider = _call_model(prompt, system_prompt=system_prompt)
        logger.info(f"[translate] LLM provider used: {provider}")

        code_match = re.search(r"```(?:\w+)?\s*\n([\s\S]*?)\n```", raw_output)
        translated_code = code_match.group(1).strip() if code_match else raw_output.strip()

        notes = [
            line.strip().replace("- Note: ", "").replace("- ", "")
            for line in raw_output.splitlines()
            if line.strip().startswith("- ") or line.strip().startswith("Note:")
        ]
        # Enforce non-empty notes — if LLM omitted them, add caveat or default
        if not notes:
            if caveat:
                notes = [caveat]
            else:
                notes = [f"Direct idiomatic translation from {src} to {target}."]

        return translated_code, notes, src
    except Exception as err:
        logger.error(f"Error in translate: {err}")
        return f"// Translation failed: {str(err)}\n{code}", [str(err)], src


_PR_REQUIRED_SECTIONS = [
    "## 📌 PR Summary",
    "## ⚠️ Technical Risks",
    "## 🧪 Suggested Test Cases",
    "## 📋 Code Changes",
]

_HIGH_RISK_KEYWORDS = frozenset([
    "auth", "login", "password", "token", "jwt", "oauth",
    "payment", "stripe", "charge", "billing", "invoice",
    "db", "database", "sql", "query", "migration", "schema",
    "admin", "permission", "role", "secret", "credential",
])


def _check_pr_sections(markdown: str) -> List[str]:
    """Returns list of missing required section headers."""
    missing = []
    for section in _PR_REQUIRED_SECTIONS:
        # Match header regardless of emoji variant (check stem text)
        stem = section.split(" ", 2)[-1]  # e.g. "PR Summary"
        if not re.search(re.escape(stem), markdown, re.IGNORECASE):
            missing.append(section)
    return missing


def _has_high_risk_code(code: str) -> bool:
    """Returns True if the code touches auth/payment/db — requires non-empty risk list."""
    code_lower = code.lower()
    return any(kw in code_lower for kw in _HIGH_RISK_KEYWORDS)


def pr_review(
    code: str, language: Optional[str] = None, pr_title: Optional[str] = None
) -> Tuple[str, str, List[str], List[str], str]:
    """Generates a GitHub PR description and code review summary.

    Quality guards:
      - All four required section headers must be present; retries once if missing.
      - For code touching auth/payment/db keywords, enforces a non-empty risk checklist.
    """
    detected = detect_language(code, language)
    title = pr_title or "Code Update & Refactoring"
    high_risk = _has_high_risk_code(code)

    _BASE_SYSTEM = (
        "You are a GitHub Pull Request & Code Review Specialist. Generate a comprehensive PR Review document.\n"
        "Return clean Markdown formatted with EXACTLY these four section headers (include emoji):\n"
        "## 📌 PR Summary\n"
        "...your content here...\n\n"
        "## ⚠️ Technical Risks & Caveats\n"
        "...your content here...\n\n"
        "## 🧪 Suggested Test Cases\n"
        "...your content here...\n\n"
        "## 📋 Code Changes Breakdown\n"
        "...your content here...\n"
        + (
            "\n\nCRITICAL: This code touches authentication, payments, or database logic. "
            "The '## ⚠️ Technical Risks & Caveats' section MUST contain a non-empty checklist of risks. "
            "Do not leave it empty or with only a single generic bullet."
            if high_risk else ""
        )
    )

    _RETRY_SYSTEM = (
        _BASE_SYSTEM
        + "\n\nCRITICAL: Your previous response was missing one or more required section headers. "
        "You MUST include all four ## headers exactly as specified. Do not skip any section."
    )

    prompt = f"PR Title: {title}\nLanguage: {detected}\n\nCode Snippet:\n```{detected}\n{code}\n```"

    try:
        markdown, provider = _call_model(prompt, system_prompt=_BASE_SYSTEM)
        logger.info(f"[pr_review] LLM provider used: {provider}")

        missing_sections = _check_pr_sections(markdown)
        if missing_sections:
            logger.warning(f"[pr_review] Missing sections {missing_sections} — retrying.")
            try:
                from app.observability import record_retry, record_validation
                record_retry()
                record_validation(False)
            except Exception:
                pass
            markdown, retry_provider = _call_model(prompt, system_prompt=_RETRY_SYSTEM)
            logger.info(f"[pr_review] Retry provider: {retry_provider}")
            still_missing = _check_pr_sections(markdown)
            if still_missing:
                logger.error(f"[pr_review] Retry still missing sections: {still_missing}")

        summary = f"Pull Request review generated for {title} in {detected}."

        # Extract risks from Technical Risks section specifically
        risks_section = re.search(
            r"##.*Technical Risks.*?\n([\s\S]*?)(?=^##|\Z)", markdown, re.MULTILINE | re.IGNORECASE
        )
        risks_text = risks_section.group(1) if risks_section else markdown
        risks = [
            line.strip().lstrip("- ").strip()
            for line in risks_text.splitlines()
            if line.strip().startswith("- ") and len(line.strip()) > 4
        ][:6]

        # Enforce non-empty risk list for high-risk code
        if high_risk and not risks:
            risks = [
                "Auth/payment/database logic detected — manual security review recommended.",
                "Ensure all inputs are validated and sanitised.",
                "Verify no secrets or credentials are exposed in the diff.",
            ]

        # Extract test suggestions from Suggested Test Cases section
        tests_section = re.search(
            r"##.*Suggested Test.*?\n([\s\S]*?)(?=^##|\Z)", markdown, re.MULTILINE | re.IGNORECASE
        )
        tests_text = tests_section.group(1) if tests_section else markdown
        tests = [
            line.strip().lstrip("- ").strip()
            for line in tests_text.splitlines()
            if line.strip().startswith("- ") and len(line.strip()) > 4
        ][:6]

        return summary, markdown, risks, tests, detected
    except Exception as err:
        logger.error(f"Error in pr_review: {err}")
        return f"PR review generation failed: {err}", f"# PR Review\n\nFailed to generate review: {err}", [], [], detected


def flowchart(
    code: str, language: Optional[str] = None
) -> Tuple[str, int, str, str]:
    """Generates valid Mermaid.js graph TD syntax representing logic flow.

    Pipeline:
      1. Ask the LLM to produce a ```mermaid block.
      2. Sanitize the output (reserved-word prefixing + label escaping).
      3. Validate the sanitized output structurally.
      4. On validation failure, retry once with a corrective system message.
      5. On second failure, return a structured error sentinel so the caller
         can propagate a clean error rather than broken Mermaid syntax.
    """
    from app.mermaid_sanitizer import sanitize as _mermaid_sanitize, validate as _mermaid_validate

    detected = detect_language(code, language)

    _BASE_SYSTEM = (
        "You are a software visualizer. Convert the logical flow of the code into a valid Mermaid.js flowchart.\n"
        "Output ONLY valid Mermaid graph TD code inside a ```mermaid ... ``` codeblock.\n"
        "Rules:\n"
        "- Start with exactly `graph TD` on the first line.\n"
        "- All node labels must be quoted strings if they contain special characters.\n"
        "- Never use reserved Mermaid keywords (end, class, subgraph, style, direction, graph) as bare node IDs.\n"
        "- Every subgraph block must be closed with `end`.\n"
        "- Do not truncate — output the complete diagram.\n"
        "Example:\n"
        "```mermaid\n"
        "graph TD\n"
        "  Start([Start Execution]) --> CheckInput{Input Valid?}\n"
        "  CheckInput -- Yes --> Process[Process Payload]\n"
        "  CheckInput -- No --> Error[Return Error 400]\n"
        "  Process --> Finish([End Execution])\n"
        "```"
    )

    _RETRY_SYSTEM = (
        _BASE_SYSTEM
        + "\n\nIMPORTANT: Your previous output failed validation. Common problems:\n"
        "- Missing `graph TD` header.\n"
        "- Using `end` as a node ID — use `EndNode` instead.\n"
        "- Unmatched subgraph/end blocks.\n"
        "- Dangling `-->` with no target node.\n"
        "Please output a corrected, complete Mermaid diagram."
    )

    def _extract_and_sanitize(raw: str) -> Optional[str]:
        mermaid_match = re.search(r"```mermaid\s*\n([\s\S]*?)\n```", raw)
        raw_code = mermaid_match.group(1).strip() if mermaid_match else raw.strip()
        return _mermaid_sanitize(raw_code)

    prompt = f"Language: {detected}\n\nCode:\n```{detected}\n{code}\n```"

    try:
        raw_output, provider = _call_model(prompt, system_prompt=_BASE_SYSTEM)
        logger.info(f"[flowchart] LLM provider used: {provider}")
        mermaid_code = _extract_and_sanitize(raw_output)

        ok, reason = _mermaid_validate(mermaid_code)
        if not ok:
            logger.warning(f"[flowchart] Initial output failed validation ({reason}). Retrying with corrective prompt.")
            try:
                from app.observability import record_retry, record_validation
                record_retry()
                record_validation(False)
            except Exception:
                pass
            retry_output, retry_provider = _call_model(prompt, system_prompt=_RETRY_SYSTEM)
            logger.info(f"[flowchart] Retry LLM provider: {retry_provider}")
            mermaid_code = _extract_and_sanitize(retry_output)
            ok2, reason2 = _mermaid_validate(mermaid_code)
            if not ok2:
                logger.error(f"[flowchart] Retry also failed validation: {reason2}")
                raise ValueError(f"Generated Mermaid diagram is invalid after retry: {reason2}")

        nodes_count = len(re.findall(r"-->|---|==>", mermaid_code)) + 1
        summary = f"Generated {nodes_count}-node flowchart for {detected} logic."
        return mermaid_code, nodes_count, summary, detected

    except Exception as err:
        logger.error(f"Error in flowchart: {err}")
        fallback = "graph TD\n  Start([Start Execution]) --> Execute[Execute Code Snippet] --> End([Complete])"
        return fallback, 3, "Fallback flowchart generated.", detected

