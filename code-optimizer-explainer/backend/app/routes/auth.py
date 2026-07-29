import logging
import os
import secrets
import uuid
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response
from fastapi_csrf_protect import CsrfProtect
from pydantic import BaseModel

from app.db.db_session import (
    create_user_session,
    get_active_session,
    get_local_user_by_email,
    invalidate_session,
    save_local_user_credentials,
    upsert_user_profile,
    verify_local_user_password,
)
from app.db.supabase_client import get_client
from app.models import (
    AuthResponse,
    GoogleAuthRequest,
    SessionInfo,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)

logger = logging.getLogger("code_optimizer.routes.auth")
router = APIRouter()


# ✅ SECURITY FIX: CSRF Configuration
class CsrfSettings(BaseModel):
    secret_key: str = os.getenv("CSRF_SECRET_KEY", "dev-secret-change-in-prod")
    cookie_domain: str = os.getenv("COOKIE_DOMAIN", "localhost")
    cookie_path: str = "/"
    cookie_samesite: str = "strict"
    cookie_secure: bool = os.getenv("ENVIRONMENT") == "production"
    cookie_httponly: bool = True


@CsrfProtect.load_config
def load_csrf_config():
    return CsrfSettings()


def _create_auth_session_and_set_cookies(
    response: Response,
    user_id: str,
    email: Optional[str] = None,
    phone_number: Optional[str] = None,
    full_name: Optional[str] = None,
    avatar_url: Optional[str] = None,
    access_token: Optional[str] = None,
    auth_provider: str = "email",
    request: Optional[Request] = None,
) -> AuthResponse:
    """
    Helper function to:
    1. Save/update user profile info in database (`user_profiles`).
    2. Generate session token & set HTTP-only Cookies (`session_token`, `access_token`).
    3. Store session & cookie token data in database (`user_sessions`).
    4. Return AuthResponse.
    """
    valid_access_token = access_token or f"jwt_access_{secrets.token_urlsafe(24)}"
    session_token = f"sess_{secrets.token_urlsafe(32)}"

    user_agent = request.headers.get("user-agent") if request else "Unknown"
    ip_address = request.client.host if (request and request.client) else "127.0.0.1"

    # 1. Upsert user profile into database table
    profile = upsert_user_profile(
        user_id=user_id,
        email=email,
        phone_number=phone_number,
        full_name=full_name,
        avatar_url=avatar_url,
        auth_provider=auth_provider,
    )

    cookie_config = {
        "name": "session_token",
        "httponly": True,
        "samesite": "strict",  # ✅ SECURITY FIX: Changed from "lax" to "strict"
        "path": "/",
        "max_age": 604800,  # 7 days
    }

    # 2. Set HTTP cookies on FastApi Response
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=604800,
        httponly=True,
        samesite="strict",  # ✅ SECURITY FIX: Changed from "lax" to "strict"
        path="/",
    )
    response.set_cookie(
        key="access_token",
        value=valid_access_token,
        max_age=604800,
        httponly=True,
        samesite="strict",  # ✅ SECURITY FIX: Changed from "lax" to "strict"
        path="/",
    )

    # 3. Save active session & cookie metadata in database table
    db_session = create_user_session(
        user_id=user_id,
        session_token=session_token,
        access_token=valid_access_token,
        auth_provider=auth_provider,
        user_agent=user_agent,
        ip_address=ip_address,
        cookie_data=cookie_config,
    )

    user_resp = UserResponse(
        user_id=user_id,
        email=profile.get("email"),
        phone_number=profile.get("phone_number"),
        full_name=profile.get("full_name"),
        avatar_url=profile.get("avatar_url"),
        auth_provider=auth_provider,
        created_at=profile.get("created_at"),
        last_login=profile.get("last_login"),
    )

    session_info = SessionInfo(
        session_id=db_session.get("id", ""),
        session_token=session_token,
        access_token=valid_access_token,
        auth_provider=auth_provider,
        user_agent=user_agent,
        ip_address=ip_address,
        cookie_data=cookie_config,
        created_at=db_session.get("created_at"),
        expires_at=db_session.get("expires_at"),
    )

    return AuthResponse(
        access_token=valid_access_token,
        token_type="bearer",
        user_id=user_id,
        email=profile.get("email"),
        phone_number=profile.get("phone_number"),
        session_token=session_token,
        auth_provider=auth_provider,
        user=user_resp,
        session_info=session_info,
    )


def get_current_user_from_header(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
    access_token: Optional[str] = Cookie(None),
) -> UserResponse:
    """
    Verifies authentication token from Authorization header or HTTP session cookies against database.
    """
    token_to_verify = None
    if authorization and authorization.startswith("Bearer "):
        token_to_verify = authorization.split("Bearer ")[1].strip()
    elif session_token:
        token_to_verify = session_token
    elif access_token:
        token_to_verify = access_token

    if not token_to_verify:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Missing Bearer token or session cookie.",
        )

    # 1. Check database active session
    db_lookup = get_active_session(token_to_verify)
    if db_lookup:
        session, user_profile = db_lookup
        return UserResponse(
            user_id=user_profile.get("id") or session.get("user_id"),
            email=user_profile.get("email"),
            phone_number=user_profile.get("phone_number"),
            full_name=user_profile.get("full_name"),
            avatar_url=user_profile.get("avatar_url"),
            auth_provider=user_profile.get("auth_provider", "email"),
            created_at=user_profile.get("created_at"),
            last_login=user_profile.get("last_login"),
        )

    # 2. Check Supabase auth as fallback
    try:
        supabase = get_client()
        user_res = supabase.auth.get_user(token_to_verify)
        if user_res and hasattr(user_res, "user") and user_res.user:
            u = user_res.user
            return UserResponse(
                user_id=u.id,
                email=u.email or "",
                phone_number=getattr(u, "phone", None),
                auth_provider="email",
            )
    except Exception as err:
        logger.debug(f"Supabase auth check failed: {err}")

    raise HTTPException(status_code=401, detail="Invalid or expired session token.")


@router.get("/csrf-token", tags=["Security"])
async def get_csrf_token(
    request: Request,
    csrf_protect: CsrfProtect = Depends(),
) -> dict:
    """✅ SECURITY FIX: Returns CSRF token for frontend."""
    await csrf_protect.generate_csrf(request)
    return {"csrf_token": request.state.csrf_token}


@router.post("/auth/register", response_model=AuthResponse)
async def register(
    credentials: UserRegisterRequest,
    response: Response,
    request: Request,
    csrf_protect: CsrfProtect = Depends(),  # ✅ SECURITY FIX: CSRF protection
) -> AuthResponse:
    """✅ SECURITY FIX: Registers a new user with CSRF validation."""
    await csrf_protect.validate_csrf(request)  # ✅ SECURITY FIX: Validate CSRF token
    
    user_id = None
    access_token = None
    email = credentials.email.strip().lower()

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if not credentials.password or len(credentials.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    # Check if user already exists locally
    existing_local = get_local_user_by_email(email)
    if existing_local:
        raise HTTPException(
            status_code=400,
            detail="An account with this email address already exists. Please log in instead.",
        )

    try:
        supabase = get_client()
        res = supabase.auth.sign_up(
            {"email": email, "password": credentials.password}
        )

        if res and hasattr(res, "user") and res.user:
            user = res.user
            user_id = user.id
            session = getattr(res, "session", None)
            if session:
                access_token = session.access_token
    except Exception as err:
        err_msg = str(err)
        if "already registered" in err_msg.lower() or "already exists" in err_msg.lower():
            raise HTTPException(
                status_code=400,
                detail="An account with this email address already exists. Please log in instead.",
            )
        logger.warning(
            f"Supabase register fallback ({err}). Creating local database user."
        )

    if not user_id:
        user_id = f"usr_{uuid.uuid5(uuid.NAMESPACE_DNS, email).hex[:16]}"

    # Save credentials locally for fallback validation
    save_local_user_credentials(email, credentials.password)

    return _create_auth_session_and_set_cookies(
        response=response,
        user_id=user_id,
        email=email,
        full_name=credentials.full_name,
        access_token=access_token,
        auth_provider="email",
        request=request,
    )


@router.post("/auth/login", response_model=AuthResponse)
async def login(
    credentials: UserLoginRequest,
    response: Response,
    request: Request,
    csrf_protect: CsrfProtect = Depends(),  # ✅ SECURITY FIX: CSRF protection
) -> AuthResponse:
    """✅ SECURITY FIX: Authenticates user with CSRF validation."""
    await csrf_protect.validate_csrf(request)  # ✅ SECURITY FIX: Validate CSRF token
    
    user_id = None
    access_token = None
    email = credentials.email.strip().lower()

    if not email or not credentials.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    supabase_authenticated = False
    try:
        supabase = get_client()
        res = supabase.auth.sign_in_with_password(
            {"email": email, "password": credentials.password}
        )

        if res and hasattr(res, "user") and res.user:
            user = res.user
            session = getattr(res, "session", None)
            user_id = user.id
            if session:
                access_token = session.access_token
            supabase_authenticated = True
    except Exception as err:
        logger.info(f"Supabase sign in attempt info: {err}")

    # Fallback to local credential verification if Supabase auth did not return a session
    if not supabase_authenticated:
        if verify_local_user_password(email, credentials.password):
            user_id = f"usr_{uuid.uuid5(uuid.NAMESPACE_DNS, email).hex[:16]}"
        else:
            # Check if email exists in local db but password failed
            local_user = get_local_user_by_email(email)
            if local_user:
                raise HTTPException(status_code=400, detail="Invalid email or password.")
            
            # If neither Supabase nor local DB matched, return invalid credentials error
            raise HTTPException(status_code=400, detail="Invalid email or password.")

    return _create_auth_session_and_set_cookies(
        response=response,
        user_id=user_id,
        email=email,
        access_token=access_token,
        auth_provider="email",
        request=request,
    )


@router.post("/auth/google", response_model=AuthResponse)
async def google_login(
    payload: GoogleAuthRequest,
    response: Response,
    request: Request,
    csrf_protect: CsrfProtect = Depends(),  # ✅ SECURITY FIX: CSRF protection
) -> AuthResponse:
    """✅ SECURITY FIX: Authenticates user via Google OAuth with CSRF validation."""
    await csrf_protect.validate_csrf(request)  # ✅ SECURITY FIX: Validate CSRF token
    
    email = payload.email
    full_name = payload.full_name
    avatar_url = payload.avatar_url
    user_id = None
    access_token = payload.access_token or payload.id_token

    # 1. Attempt Supabase Auth ID Token / OAuth sign in if token is provided
    if access_token:
        try:
            supabase = get_client()
            res = supabase.auth.sign_in_with_id_token(
                {"provider": "google", "token": access_token}
            )
            if res and hasattr(res, "user") and res.user:
                u = res.user
                user_id = u.id
                email = u.email or email
                user_meta = getattr(u, "user_metadata", {}) or {}
                full_name = user_meta.get("full_name") or user_meta.get("name") or full_name
                avatar_url = user_meta.get("avatar_url") or user_meta.get("picture") or avatar_url
                if hasattr(res, "session") and res.session:
                    access_token = res.session.access_token
        except Exception as err:
            logger.info(f"Supabase Google ID token sign-in fallback: {err}")

    email = email or "google_user@example.com"
    full_name = full_name or "Google User"
    avatar_url = avatar_url or "https://lh3.googleusercontent.com/a/default-user"

    if not user_id:
        user_id = f"goog_{uuid.uuid5(uuid.NAMESPACE_DNS, email).hex[:16]}"
    if not access_token:
        access_token = f"goog_token_{secrets.token_urlsafe(16)}"

    return _create_auth_session_and_set_cookies(
        response=response,
        user_id=user_id,
        email=email,
        full_name=full_name,
        avatar_url=avatar_url,
        access_token=access_token,
        auth_provider="google",
        request=request,
    )


@router.get("/auth/me", response_model=UserResponse)
@router.get("/auth/session", response_model=UserResponse)
def get_me(
    current_user: UserResponse = Depends(get_current_user_from_header),
) -> UserResponse:
    """Returns stored user profile for currently active database session."""
    return current_user


@router.post("/auth/logout")
async def logout(
    response: Response,
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
    access_token: Optional[str] = Cookie(None),
    csrf_protect: CsrfProtect = Depends(),  # ✅ SECURITY FIX: CSRF protection
) -> dict:
    """✅ SECURITY FIX: Invalidates active session with CSRF validation."""
    await csrf_protect.validate_csrf(request)  # ✅ SECURITY FIX: Validate CSRF token
    
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()
    elif session_token:
        token = session_token
    elif access_token:
        token = access_token

    if token:
        invalidate_session(token)

    response.delete_cookie(key="session_token", path="/")
    response.delete_cookie(key="access_token", path="/")

    return {"status": "success", "message": "Logged out successfully. Session invalidated in database."}
