import logging
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException

from app.db.supabase_client import get_client
from app.models import AuthResponse, UserLoginRequest, UserRegisterRequest, UserResponse

logger = logging.getLogger("code_optimizer.routes.auth")
router = APIRouter()


def get_current_user_from_header(
    authorization: Optional[str] = Header(None),
) -> UserResponse:
    """Verifies Bearer JWT token from Authorization header using Supabase Auth."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing or invalid. Format: 'Bearer <token>'",
        )

    token = authorization.split("Bearer ")[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Token missing.")

    try:
        supabase = get_client()
        user_res = supabase.auth.get_user(token)
        if not user_res or not hasattr(user_res, "user") or not user_res.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")

        user = user_res.user
        return UserResponse(user_id=user.id, email=user.email or "")
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error verifying authentication token: {err}")
        raise HTTPException(
            status_code=401, detail="Invalid authentication token."
        ) from err


@router.post("/auth/register", response_model=AuthResponse)
def register(credentials: UserRegisterRequest) -> AuthResponse:
    """Registers a new user using Supabase Auth."""
    try:
        supabase = get_client()
        res = supabase.auth.sign_up(
            {"email": credentials.email, "password": credentials.password}
        )

        if not res or not hasattr(res, "user") or not res.user:
            raise HTTPException(
                status_code=400, detail="Registration failed. Please try again."
            )

        user = res.user
        session = getattr(res, "session", None)
        token = session.access_token if session else ""

        return AuthResponse(
            access_token=token,
            token_type="bearer",
            user_id=user.id,
            email=user.email or credentials.email,
        )
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Registration error: {err}", exc_info=True)
        err_msg = str(err)
        if "already registered" in err_msg.lower():
            raise HTTPException(
                status_code=400, detail="User with this email is already registered."
            ) from err
        raise HTTPException(
            status_code=400, detail=f"Registration failed: {err_msg}"
        ) from err


@router.post("/auth/login", response_model=AuthResponse)
def login(credentials: UserLoginRequest) -> AuthResponse:
    """Authenticates a user and returns a JWT access token using Supabase Auth."""
    try:
        supabase = get_client()
        res = supabase.auth.sign_in_with_password(
            {"email": credentials.email, "password": credentials.password}
        )

        if not res or not hasattr(res, "session") or not res.session:
            raise HTTPException(
                status_code=401, detail="Invalid email or password credentials."
            )

        session = res.session
        user = res.user

        return AuthResponse(
            access_token=session.access_token,
            token_type="bearer",
            user_id=user.id,
            email=user.email or credentials.email,
        )
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Login error: {err}", exc_info=True)
        err_msg = str(err)
        if "email not confirmed" in err_msg.lower():
            raise HTTPException(
                status_code=403,
                detail="Email address not confirmed yet. Turn off 'Confirm Email' in Supabase Auth settings for instant login, or verify your email.",
            ) from err
        raise HTTPException(
            status_code=401, detail="Authentication failed. Invalid email or password."
        ) from err


@router.get("/auth/me", response_model=UserResponse)
def get_me(
    current_user: UserResponse = Depends(get_current_user_from_header),
) -> UserResponse:
    """Returns profile info for currently authenticated user."""
    return current_user
