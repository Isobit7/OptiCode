import datetime
import logging
import os
import uuid
from typing import Any, Dict, Optional, Tuple

from passlib.context import CryptContext
from app.db.supabase_client import get_client

logger = logging.getLogger("code_optimizer.db_session")

# ✅ SECURITY FIX: Initialize bcrypt context with cost factor 12
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,  # Cost factor 12-14 recommended
)

# Local in-memory/fallback database storage for session and user profile resilience
_LOCAL_USERS_DB: Dict[str, Dict[str, Any]] = {}
_LOCAL_CREDENTIALS_DB: Dict[str, str] = {}  # email -> hashed password
_LOCAL_SESSIONS_DB: Dict[str, Dict[str, Any]] = {}


def hash_password(password: str) -> str:
    """✅ SECURITY FIX: Hashes password using bcrypt with automatic salt generation."""
    if not password:
        raise ValueError("Password cannot be empty")
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    return pwd_context.hash(password)


def get_local_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Finds a local user profile by email address."""
    clean_email = email.strip().lower()
    for user in _LOCAL_USERS_DB.values():
        if user.get("email", "").strip().lower() == clean_email:
            return user
    return None


def save_local_user_credentials(email: str, password: str) -> None:
    """Stores local password hash for an email address."""
    clean_email = email.strip().lower()
    _LOCAL_CREDENTIALS_DB[clean_email] = hash_password(password)


def verify_local_user_password(email: str, password: str) -> bool:
    """✅ SECURITY FIX: Verifies password against bcrypt hash with timing attack protection."""
    clean_email = email.strip().lower()
    stored_hash = _LOCAL_CREDENTIALS_DB.get(clean_email)
    
    if not stored_hash:
        # Still hash to prevent timing attacks
        try:
            pwd_context.verify(password, "$2b$12$invalid.hash.to.prevent.timing.attacks")
        except:
            pass
        return False
    
    try:
        return pwd_context.verify(password, stored_hash)
    except Exception as err:
        logger.warning(f"Password verification error for {clean_email}: {err}")
        return False



def upsert_user_profile(
    user_id: str,
    email: Optional[str] = None,
    phone_number: Optional[str] = None,
    full_name: Optional[str] = None,
    avatar_url: Optional[str] = None,
    auth_provider: str = "email",
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Stores or updates user profile information in the database (`user_profiles` table).
    Falls back gracefully to local storage if Supabase credentials/connection are unavailable.
    """
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    profile_data = {
        "id": user_id,
        "email": email or "",
        "phone_number": phone_number or "",
        "full_name": full_name or "",
        "avatar_url": avatar_url or "",
        "auth_provider": auth_provider,
        "last_login": now_iso,
        "updated_at": now_iso,
        "metadata": metadata or {},
    }

    try:
        supabase = get_client()
        # Fetch existing profile if present to update login_count
        existing = (
            supabase.table("user_profiles")
            .select("login_count, created_at")
            .eq("id", user_id)
            .execute()
        )
        login_count = 1
        created_at = now_iso
        if hasattr(existing, "data") and existing.data and len(existing.data) > 0:
            row = existing.data[0]
            login_count = (row.get("login_count") or 0) + 1
            created_at = row.get("created_at") or now_iso

        profile_data["login_count"] = login_count
        profile_data["created_at"] = created_at

        res = supabase.table("user_profiles").upsert(profile_data).execute()
        if hasattr(res, "data") and res.data and len(res.data) > 0:
            return res.data[0]
        return profile_data
    except Exception as err:
        logger.warning(
            f"Supabase user_profiles upsert failed ({err}). Operating on local session fallback."
        )

    # Local fallback
    if user_id in _LOCAL_USERS_DB:
        existing = _LOCAL_USERS_DB[user_id]
        profile_data["login_count"] = (existing.get("login_count") or 0) + 1
        profile_data["created_at"] = existing.get("created_at") or now_iso
    else:
        profile_data["login_count"] = 1
        profile_data["created_at"] = now_iso

    _LOCAL_USERS_DB[user_id] = profile_data
    return profile_data


def create_user_session(
    user_id: str,
    session_token: str,
    access_token: str,
    auth_provider: str = "email",
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None,
    cookie_data: Optional[Dict[str, Any]] = None,
    expires_in_seconds: int = 86400 * 7,
) -> Dict[str, Any]:
    """
    ✅ SECURITY FIX: Creates and stores session in database.
    Production mode: Supabase only (no fallback).
    Dev mode: Supabase with local fallback.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    expires_at = now + datetime.timedelta(seconds=expires_in_seconds)

    session_id = str(uuid.uuid4())
    session_record = {
        "id": session_id,
        "user_id": user_id,
        "session_token": session_token,
        "access_token": access_token,
        "auth_provider": auth_provider,
        "user_agent": user_agent or "unknown",
        "ip_address": ip_address or "127.0.0.1",
        "cookie_data": cookie_data
        or {
            "name": "session_token",
            "httponly": True,
            "samesite": "strict",  # ✅ Changed from "lax" to "strict"
            "path": "/",
            "max_age": expires_in_seconds,
        },
        "is_active": True,
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
    }

    is_production = os.getenv("ENVIRONMENT") == "production"

    try:
        supabase = get_client()
        res = supabase.table("user_sessions").insert(session_record).execute()
        if hasattr(res, "data") and res.data and len(res.data) > 0:
            return res.data[0]
        return session_record
    except Exception as err:
        if is_production:
            # ❌ PRODUCTION: Database required
            logger.error(f"CRITICAL: Supabase session insert failed in production: {err}")
            raise RuntimeError("Session storage unavailable - database connection required")
        else:
            # ✅ DEV: Allow fallback
            logger.warning(
                f"Supabase user_sessions insert failed ({err}). Storing session in local fallback."
            )

    # ✅ DEV ONLY: Local fallback (not production)
    _LOCAL_SESSIONS_DB[session_token] = session_record
    _LOCAL_SESSIONS_DB[session_id] = session_record
    return session_record


def get_active_session(token: str) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
    """
    ✅ SECURITY FIX: Retrieves active session from database.
    Production mode: Supabase only (no fallback).
    Dev mode: Supabase with local fallback.
    """
    if not token:
        return None

    is_production = os.getenv("ENVIRONMENT") == "production"

    try:
        supabase = get_client()
        # Query active session matching session_token or access_token
        res_session = (
            supabase.table("user_sessions")
            .select("*")
            .eq("is_active", True)
            .or_(f"session_token.eq.{token},access_token.eq.{token}")
            .execute()
        )
        if hasattr(res_session, "data") and res_session.data and len(res_session.data) > 0:
            session = res_session.data[0]
            user_id = session.get("user_id")

            # Fetch user profile
            res_user = (
                supabase.table("user_profiles")
                .select("*")
                .eq("id", user_id)
                .execute()
            )
            user_profile = (
                res_user.data[0]
                if hasattr(res_user, "data") and res_user.data and len(res_user.data) > 0
                else {"id": user_id, "email": "", "auth_provider": session.get("auth_provider", "email")}
            )
            return session, user_profile
    except Exception as err:
        if is_production:
            logger.warning(f"Supabase session lookup failed in production: {err}")
            return None
        logger.debug(f"Supabase session lookup check fallback ({err})")

    # ✅ DEV ONLY: Local fallback (not production)
    if not is_production:
        session = _LOCAL_SESSIONS_DB.get(token)
        if session and session.get("is_active", True):
            user_id = session.get("user_id")
            user_profile = _LOCAL_USERS_DB.get(user_id, {
                "id": user_id,
                "email": "",
                "phone_number": "",
                "full_name": "",
                "auth_provider": session.get("auth_provider", "email"),
            })
            return session, user_profile

    return None


def invalidate_session(token: str) -> bool:
    """
    Deactivates/invalidates session record in database when user logs out.
    """
    if not token:
        return False

    success = False
    try:
        supabase = get_client()
        supabase.table("user_sessions").update({"is_active": False}).or_(
            f"session_token.eq.{token},access_token.eq.{token}"
        ).execute()
        success = True
    except Exception as err:
        logger.warning(f"Supabase session invalidation failed ({err})")

    if token in _LOCAL_SESSIONS_DB:
        _LOCAL_SESSIONS_DB[token]["is_active"] = False
        success = True

    return success
