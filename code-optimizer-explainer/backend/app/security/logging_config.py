"""
✅ SECURITY FIX: Sanitizing logger to prevent API key leaks
"""
import logging
import re
from typing import List, Tuple


class SanitizingFormatter(logging.Formatter):
    """
    ✅ SECURITY FIX: Redacts secrets from log messages.
    Removes API keys, tokens, passwords, and other sensitive data.
    """
    
    PATTERNS_TO_REDACT: List[Tuple[str, str]] = [
        # Authorization tokens
        (r'Bearer\s+[^\s"\']*', 'Bearer [REDACTED_TOKEN]'),
        (r'token["\']?\s*[:=]\s*["\']?[^"\']*["\']?', 'token=[REDACTED]'),
        (r'access_token["\']?\s*[:=]\s*["\']?[^"\']*["\']?', 'access_token=[REDACTED]'),
        (r'session_token["\']?\s*[:=]\s*["\']?[^"\']*["\']?', 'session_token=[REDACTED]'),
        
        # API Keys
        (r'api[-_]key["\']?\s*[:=]\s*["\']?[^"\']*["\']?', 'api_key=[REDACTED]'),
        (r'(groq|gemini|openrouter)[-_]?key["\']?\s*[:=]\s*[^\s,}]*', r'\1_key=[REDACTED]'),
        (r'GROQ_API_KEY\s*=\s*[^\s]*', 'GROQ_API_KEY=[REDACTED]'),
        (r'GEMINI_API_KEY\s*=\s*[^\s]*', 'GEMINI_API_KEY=[REDACTED]'),
        (r'LLM_API_KEY\s*=\s*[^\s]*', 'LLM_API_KEY=[REDACTED]'),
        
        # Passwords
        (r'password["\']?\s*[:=]\s*["\']?[^"\']*["\']?', 'password=[REDACTED]'),
        (r'passwd["\']?\s*[:=]\s*["\']?[^"\']*["\']?', 'passwd=[REDACTED]'),
        
        # Authorization headers
        (r'Authorization["\']?\s*[:=]\s*["\']?[^"\']*["\']?', 'Authorization=[REDACTED]'),
        (r'X-API-Key["\']?\s*[:=]\s*[^\s,}]*', 'X-API-Key=[REDACTED]'),
        
        # Secrets
        (r'secret["\']?\s*[:=]\s*["\']?[^"\']*["\']?', 'secret=[REDACTED]'),
        (r'client_secret["\']?\s*[:=]\s*[^\s,}]*', 'client_secret=[REDACTED]'),
        
        # Database URLs
        (r'(postgresql|mysql|mongodb)://[^\s]*', r'\1://[REDACTED_URL]'),
        (r'DATABASE_URL\s*=\s*[^\s]*', 'DATABASE_URL=[REDACTED]'),
        
        # Long random strings that could be secrets
        (r'"[a-zA-Z0-9_-]{40,}"', '[REDACTED_SECRET]'),
        (r"'[a-zA-Z0-9_-]{40,}'", '[REDACTED_SECRET]'),
    ]
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record with sanitized sensitive data."""
        # Get original formatted message
        msg = super().format(record)
        
        # Redact sensitive patterns
        for pattern, replacement in self.PATTERNS_TO_REDACT:
            msg = re.sub(pattern, replacement, msg, flags=re.IGNORECASE)
        
        return msg


def setup_sanitized_logging() -> None:
    """
    ✅ SECURITY FIX: Configure logging with sanitized formatter.
    Removes API keys, tokens, and other secrets from all logs.
    """
    logger = logging.getLogger()
    
    # Update all existing handlers
    for handler in logger.handlers:
        formatter = SanitizingFormatter(
            fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
    
    # Set root logger level
    logger.setLevel(logging.INFO)
