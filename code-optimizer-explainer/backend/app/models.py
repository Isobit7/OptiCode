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


class ExplainResponse(BaseModel):
    explanation: str = Field(..., description="Plain-language code explanation.")
    detected_language: str = Field(..., description="Detected programming language.")


class HumanizeResponse(BaseModel):
    humanized_code: str = Field(
        ..., description="Idiomatic code with clear naming and comments."
    )
    detected_language: str = Field(..., description="Detected programming language.")


class AlternativeItem(BaseModel):
    code: str = Field(..., description="Alternative code implementation.")
    tradeoff: str = Field(..., description="One-line tradeoff summary.")


class AlternativesResponse(BaseModel):
    alternatives: List[AlternativeItem] = Field(
        ..., description="List of 2-3 alternative implementations with tradeoffs."
    )
    detected_language: str = Field(..., description="Detected programming language.")


class PrettifyResponse(BaseModel):
    formatted_code: str = Field(..., description="Formatted / prettified code.")


class ShortenResponse(BaseModel):
    shortened_code: str = Field(..., description="Minified / shortened code.")


class SeoOptimizeResponse(BaseModel):
    optimized_code: str = Field(..., description="SEO-optimized HTML markup.")
    suggestions: List[str] = Field(
        ..., description="List of SEO structural improvement suggestions."
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


class UserLoginRequest(BaseModel):
    email: str = Field(..., description="User email address.")
    password: str = Field(..., description="User password.")


class AuthResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token.")
    token_type: str = Field("bearer", description="Token type.")
    user_id: str = Field(..., description="Authenticated user ID.")
    email: str = Field(..., description="User email address.")


class UserResponse(BaseModel):
    user_id: str = Field(..., description="User ID.")
    email: str = Field(..., description="User email address.")
