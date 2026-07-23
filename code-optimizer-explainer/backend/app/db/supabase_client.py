import logging
import os
from typing import Optional

from supabase import Client, create_client

logger = logging.getLogger("code_optimizer.db")

_supabase_client: Optional[Client] = None


def get_client() -> Client:
    """Returns singleton Supabase client initialized with the server-side service key."""
    global _supabase_client

    if _supabase_client is not None:
        return _supabase_client

    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")

    if not url or not service_key:
        logger.error(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables."
        )
        raise RuntimeError(
            "Database service is not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_KEY."
        )

    try:
        _supabase_client = create_client(url, service_key)
        return _supabase_client
    except Exception as err:
        logger.error(f"Failed to initialize Supabase client: {err}")
        raise RuntimeError("Database connection error.") from err
