import logging
from fastapi import APIRouter, Depends, HTTPException

from app.cache import cache
from app.llm_interface import client as llm
from app.models import PrReviewRequest, PrReviewResponse
from app.rate_limiter import check_llm_rate_limit

logger = logging.getLogger("code_optimizer.routes.pr_review")
router = APIRouter()

MAX_CHARS = 20000


@router.post(
    "/pr-review",
    response_model=PrReviewResponse,
    dependencies=[Depends(check_llm_rate_limit)],
)
def review_pull_request(request: PrReviewRequest) -> PrReviewResponse:
    if len(request.code) > MAX_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Input exceeds maximum allowed limit of {MAX_CHARS} characters.",
        )

    cached = cache.get(
        "pr-review",
        request.code,
        request.language,
        {"title": request.pr_title},
    )
    if cached:
        logger.info("Cache hit for pr-review")
        return PrReviewResponse(**cached)

    try:
        summary, markdown, risks, tests, detected = llm.pr_review(
            request.code, request.language, request.pr_title
        )
        result = PrReviewResponse(
            summary=summary,
            github_markdown=markdown,
            potential_risks=risks,
            test_suggestions=tests,
        )
        cache.set(
            "pr-review",
            request.code,
            request.language,
            {"title": request.pr_title},
            result.model_dump(),
        )
        return result
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error in pr-review: {err}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to generate PR review."
        ) from err
