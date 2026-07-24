from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

MAX_LINES: int = 5000


class CodeRequest(BaseModel):
    code: str = Field(..., description="The raw code submitted by the user.")
    language: Optional[str] = Field(
        None, description="Optional programming language name or extension."
    )

    def line_count(self) -> int:
        return len(self.code.splitlines())


class ExplainRequest(CodeRequest):
    depth: Optional[str] = Field(
        "beginner",
        description="Explanation depth level: 'beginner', 'intermediate', or 'advanced'.",
    )


class HumanizeRequest(CodeRequest):
    mode: Optional[str] = Field(
        "de-ai",
        description="Humanization mode: 'de-ai', 'simplify', or 'idiomatic'.",
    )


class ExplainResponse(BaseModel):
    explanation: str = Field(..., description="Plain-language code explanation.")
    detected_language: str = Field(..., description="Detected programming language.")
    depth_level: str = Field("beginner", description="Applied explanation depth level.")


class HumanizeResponse(BaseModel):
    humanized_code: str = Field(
        ..., description="Idiomatic code with clear naming and comments."
    )
    detected_language: str = Field(..., description="Detected programming language.")
    mode_used: str = Field("de-ai", description="Applied humanization mode.")


class AlternativeItem(BaseModel):
    name: str = Field("Alternative Implementation", description="Title of the alternative approach.")
    code: str = Field(..., description="Alternative code implementation.")
    tradeoff: str = Field(..., description="One-line tradeoff summary.")
    pros: List[str] = Field(default_factory=list, description="Key advantages of this approach.")
    cons: List[str] = Field(default_factory=list, description="Potential drawbacks or caveats.")
    time_complexity: Optional[str] = Field(None, description="Time complexity bound (e.g. O(N log N)).")
    space_complexity: Optional[str] = Field(None, description="Space complexity bound (e.g. O(1)).")


class AlternativesResponse(BaseModel):
    alternatives: List[AlternativeItem] = Field(
        ..., description="List of 2-3 alternative implementations with tradeoffs and complexity."
    )
    detected_language: str = Field(..., description="Detected programming language.")


class PrettifyResponse(BaseModel):
    formatted_code: str = Field(..., description="Formatted / prettified code.")


class ShortenResponse(BaseModel):
    shortened_code: str = Field(..., description="Minified / shortened code.")


class SeoChecklistItem(BaseModel):
    category: str = Field(..., description="Check category (e.g. Lang, Head, Meta, Alt, Headings).")
    status: str = Field(..., description="Check status: 'pass', 'warning', or 'error'.")
    message: str = Field(..., description="Explanation of check result.")


class SeoOptimizeResponse(BaseModel):
    score: int = Field(..., description="SEO health score out of 100.")
    optimized_code: str = Field(..., description="SEO-optimized HTML markup.")
    suggestions: List[str] = Field(
        ..., description="List of SEO structural improvement suggestions."
    )
    checklist: List[SeoChecklistItem] = Field(
        default_factory=list, description="Structured SEO check status items."
    )


class HistorySaveRequest(BaseModel):
    user_id: Optional[str] = Field(
        None, description="Authenticated user ID. Required for history saving."
    )
    input_code: str = Field(..., description="Submitted code snippet.")
    feature_used: str = Field(..., description="Feature name (e.g. explain, humanize).")
    output: str = Field(..., description="Generated output content.")


class HistoryResponseItem(BaseModel):
    id: Optional[str] = None
    user_id: str
    input_code: str
    feature_used: str
    output: str
    created_at: Optional[str] = None


class UserRegisterRequest(BaseModel):
    email: str = Field(..., description="User email address.")
    password: str = Field(
        ..., min_length=6, description="User password (minimum 6 characters)."
    )
    full_name: Optional[str] = Field(None, description="Optional full name of the user.")


class UserLoginRequest(BaseModel):
    email: str = Field(..., description="User email address.")
    password: str = Field(..., description="User password.")


class GoogleAuthRequest(BaseModel):
    id_token: Optional[str] = Field(None, description="Google OAuth ID Token or Access Token.")
    access_token: Optional[str] = Field(None, description="Google Access Token.")
    email: Optional[str] = Field(None, description="User email provided by Google Auth.")
    full_name: Optional[str] = Field(None, description="User full name from Google profile.")
    avatar_url: Optional[str] = Field(None, description="User avatar image URL.")




class SessionInfo(BaseModel):
    session_id: str = Field(..., description="Unique database session ID.")
    session_token: str = Field(..., description="Session token string.")
    access_token: str = Field(..., description="Access token string.")
    auth_provider: str = Field("email", description="Authentication provider used (email, google, phone).")
    user_agent: Optional[str] = Field(None, description="Client browser user-agent.")
    ip_address: Optional[str] = Field(None, description="Client IP address.")
    cookie_data: Optional[dict] = Field(default_factory=dict, description="Session cookie parameters.")
    created_at: Optional[str] = Field(None, description="Session creation timestamp.")
    expires_at: Optional[str] = Field(None, description="Session expiration timestamp.")


class UserResponse(BaseModel):
    user_id: str = Field(..., description="User ID.")
    email: Optional[str] = Field(None, description="User email address.")
    phone_number: Optional[str] = Field(None, description="User phone number.")
    full_name: Optional[str] = Field(None, description="User full name.")
    avatar_url: Optional[str] = Field(None, description="User avatar URL.")
    auth_provider: str = Field("email", description="Authentication provider (email, google, phone).")
    created_at: Optional[str] = Field(None, description="Profile creation timestamp.")
    last_login: Optional[str] = Field(None, description="Last login timestamp.")


class AuthResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token.")
    token_type: str = Field("bearer", description="Token type.")
    user_id: str = Field(..., description="Authenticated user ID.")
    email: Optional[str] = Field(None, description="User email address.")
    phone_number: Optional[str] = Field(None, description="User phone number.")
    session_token: str = Field(..., description="Session token stored in DB and cookies.")
    auth_provider: str = Field("email", description="Auth method used.")
    user: Optional[UserResponse] = Field(None, description="Detailed user profile model.")
    session_info: Optional[SessionInfo] = Field(None, description="Detailed session and cookie model.")

