import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Header, HTTPException, Query

from app.db.supabase_client import get_client
from app.models import HistorySaveRequest

logger = logging.getLogger("code_optimizer.routes.history")
router = APIRouter()

TABLE_NAME = "history"


def _extract_user_id(
    provided_user_id: Optional[str], authorization: Optional[str]
) -> str:
    """Extracts user_id securely from Authorization Bearer token or falls back to provided_user_id."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()
        if token:
            try:
                supabase = get_client()
                user_res = supabase.auth.get_user(token)
                if user_res and hasattr(user_res, "user") and user_res.user:
                    return user_res.user.id
            except Exception as err:
                logger.warning(
                    f"Token authentication check failed in history handler: {err}"
                )

    if provided_user_id and provided_user_id.strip():
        return provided_user_id.strip()

    raise HTTPException(
        status_code=400,
        detail="Authentication required. User ID or Bearer token must be provided.",
    )


@router.post("/history")
def save_history(
    item: HistorySaveRequest, authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    target_user_id = _extract_user_id(item.user_id, authorization)

    try:
        supabase = get_client()
        record = item.model_dump()
        record["user_id"] = target_user_id

        result = supabase.table(TABLE_NAME).insert(record).execute()
        return {
            "status": "success",
            "data": result.data if hasattr(result, "data") else [],
        }
    except RuntimeError as err:
        raise HTTPException(status_code=503, detail=str(err)) from err
    except Exception as err:
        logger.error(f"Error saving history to Supabase: {err}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to save history entry."
        ) from err


@router.get("/history")
def get_history(
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
) -> List[Dict[str, Any]]:
    target_user_id = _extract_user_id(user_id, authorization)

    try:
        supabase = get_client()
        result = (
            supabase.table(TABLE_NAME)
            .select("*")
            .eq("user_id", target_user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data if hasattr(result, "data") and result.data else []
    except RuntimeError as err:
        raise HTTPException(status_code=503, detail=str(err)) from err
    except Exception as err:
        logger.error(f"Error retrieving history from Supabase: {err}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to retrieve history entries."
        ) from err
