import logging
from fastapi import APIRouter, Depends, HTTPException

from app.cache import cache
from app.llm_interface import client as llm
from app.models import CodeRequest, FlowchartResponse
from app.rate_limiter import check_llm_rate_limit

logger = logging.getLogger("code_optimizer.routes.flowchart")
router = APIRouter()

MAX_CHARS = 20000


@router.post(
    "/flowchart",
    response_model=FlowchartResponse,
    dependencies=[Depends(check_llm_rate_limit)],
)
def generate_flowchart_diagram(request: CodeRequest) -> FlowchartResponse:
    if len(request.code) > MAX_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Input exceeds maximum allowed limit of {MAX_CHARS} characters.",
        )

    cached = cache.get("flowchart", request.code, request.language, None)
    if cached:
        logger.info("Cache hit for flowchart")
        return FlowchartResponse(**cached)

    try:
        mermaid_code, nodes_count, summary, detected = llm.flowchart(
            request.code, request.language
        )
        result = FlowchartResponse(
            mermaid_code=mermaid_code,
            nodes_count=nodes_count,
            summary=summary,
        )
        cache.set(
            "flowchart",
            request.code,
            request.language,
            None,
            result.model_dump(),
        )
        return result
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error in flowchart: {err}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to generate flowchart diagram."
        ) from err
