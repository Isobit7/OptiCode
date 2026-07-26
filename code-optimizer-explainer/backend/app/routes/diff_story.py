import difflib
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.cache import cache
from app.llm_interface import client as llm
from app.rate_limiter import check_llm_rate_limit

logger = logging.getLogger("code_optimizer.routes.diff_story")
router = APIRouter()

MAX_CHARS = 20000


class DiffStoryRequest(BaseModel):
    before_code: str = Field(..., description="Original code before changes.")
    after_code: str = Field(..., description="Modified code after changes.")
    language: Optional[str] = Field(None, description="Optional programming language.")


class DiffStoryResponse(BaseModel):
    summary: str = Field(..., description="High-level plain-English narrative of what changed.")
    key_changes: List[str] = Field(default_factory=list, description="Bullet points of key modifications.")
    reasoning: str = Field(..., description="Likely motivation/reasoning for the changes.")
    detected_language: str = Field("auto", description="Detected programming language.")


@router.post(
    "/diff-story",
    response_model=DiffStoryResponse,
    dependencies=[Depends(check_llm_rate_limit)],
)
def generate_diff_story(req: DiffStoryRequest) -> DiffStoryResponse:
    if len(req.before_code) > MAX_CHARS or len(req.after_code) > MAX_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Input exceeds maximum allowed limit of {MAX_CHARS} characters.",
        )

    if req.before_code.strip() == req.after_code.strip():
        return DiffStoryResponse(
            summary="No functional code changes detected between original and modified versions.",
            key_changes=["Code contents are identical."],
            reasoning="Refactoring or formatting check resulted in zero net changes.",
            detected_language=llm.detect_language(req.before_code, req.language),
        )

    cached = cache.get("diff-story", req.before_code, req.language, {"after": req.after_code})
    if cached:
        return DiffStoryResponse(**cached)

    detected_lang = llm.detect_language(req.after_code or req.before_code, req.language)

    # Compute server-side unified diff string
    diff_lines = list(
        difflib.unified_diff(
            req.before_code.splitlines(),
            req.after_code.splitlines(),
            fromfile="before",
            tofile="after",
            lineterm="",
        )
    )
    diff_text = "\n".join(diff_lines[:150])

    system_prompt = (
        "You are an expert PR reviewer and engineering storyteller. Analyze the provided code diff "
        "and generate a clear, narrative explanation of 'What changed and why'.\n"
        "Format your output as clean JSON with exactly these keys:\n"
        "{\n"
        '  "summary": "1-2 sentence overall summary of the change",\n'
        '  "key_changes": ["Bullet 1", "Bullet 2", "Bullet 3"],\n'
        '  "reasoning": "Likely architectural or operational reasoning for this refactor/fix"\n'
        "}"
    )

    prompt = (
        f"Language: {detected_lang}\n\n"
        f"Unified Diff:\n```diff\n{diff_text}\n```\n\n"
        f"Original Code:\n```{detected_lang}\n{req.before_code[:2000]}\n```\n\n"
        f"Modified Code:\n```{detected_lang}\n{req.after_code[:2000]}\n```"
    )

    try:
        raw_output, provider = llm._call_model(prompt, system_prompt=system_prompt)
        logger.info(f"[diff-story] LLM provider used: {provider}")

        # Extract JSON from LLM output
        import json
        json_match = llm.re.search(r"\{[\s\S]*\}", raw_output)
        if json_match:
            parsed = json.loads(json_match.group(0))
            result = DiffStoryResponse(
                summary=parsed.get("summary", "Refactoring and code updates."),
                key_changes=parsed.get("key_changes", ["Updated implementation logic."]),
                reasoning=parsed.get("reasoning", "Improved code quality and clarity."),
                detected_language=detected_lang,
            )
        else:
            result = DiffStoryResponse(
                summary=raw_output[:300],
                key_changes=["Modified code structure and logic."],
                reasoning="Refactored for efficiency and correctness.",
                detected_language=detected_lang,
            )

        cache.set("diff-story", req.before_code, req.language, {"after": req.after_code}, result.model_dump())
        return result
    except Exception as err:
        logger.error(f"Error in diff-story: {err}", exc_info=True)
        # Fallback to static diff summary if LLM fails
        return DiffStoryResponse(
            summary=f"Code modified across {len(diff_lines)} diff lines.",
            key_changes=[f"Added/removed lines in {detected_lang} file."],
            reasoning="Automated diff narrative fallback.",
            detected_language=detected_lang,
        )
