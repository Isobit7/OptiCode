"""
✅ SECURITY FIX: Code input validation and LLM output sanitization
"""
import re
from typing import Optional


class CodeValidationError(Exception):
    """Raised when code input violates security policies."""
    pass


def validate_code_input(
    code: str,
    language: Optional[str] = None,
    max_bytes: int = 50 * 1024,  # 50KB
    max_lines: int = 10000,
) -> None:
    """
    ✅ SECURITY FIX: Validates code input for security violations and resource limits.
    
    Args:
        code: Source code to validate
        language: Programming language (optional)
        max_bytes: Maximum size in bytes (50KB default)
        max_lines: Maximum number of lines (10k default)
    
    Raises:
        CodeValidationError: If validation fails
    """
    if not code:
        raise CodeValidationError("Code cannot be empty")
    
    # Check size limits
    code_bytes = len(code.encode('utf-8'))
    if code_bytes > max_bytes:
        raise CodeValidationError(
            f"Code exceeds {max_bytes} bytes ({code_bytes} bytes provided)"
        )
    
    # Check line limits
    lines = code.splitlines()
    if len(lines) > max_lines:
        raise CodeValidationError(
            f"Code exceeds {max_lines} lines ({len(lines)} lines provided)"
        )
    
    # ✅ SECURITY FIX: Check for dangerous patterns
    DANGEROUS_PATTERNS = [
        # Python execution
        (r'\b__import__\b', "Python import hijacking"),
        (r'\beval\s*\(', "Arbitrary code evaluation"),
        (r'\bexec\s*\(', "Arbitrary code execution"),
        (r'\bcompile\s*\(', "Code compilation attack"),
        (r'\bos\.system\b', "System command execution"),
        (r'\bsubprocess\.', "Subprocess execution"),
        (r'\bloadmodel\b', "Model injection"),
        
        # JavaScript execution
        (r'\bFunction\s*\(', "Dynamic function creation"),
        (r'\beval\s*\(', "Arbitrary evaluation"),
        (r'\bdocument\.write', "DOM manipulation"),
        (r'\bwindow\.location', "Redirect manipulation"),
        
        # Shell injection attempts
        (r';\s*rm\s+-', "Destructive command"),
        (r'&&\s*rm\s+-', "Chained destructive command"),
        (r'\|\s*nc\s+', "Network backdoor"),
        (r'`.*?`', "Command substitution"),
    ]
    
    for pattern, description in DANGEROUS_PATTERNS:
        if re.search(pattern, code, re.IGNORECASE | re.MULTILINE):
            raise CodeValidationError(
                f"Code contains dangerous pattern: {description} ({pattern})"
            )
    
    # Check for excessive null bytes
    if code.count('\x00') > 0:
        raise CodeValidationError("Code contains null bytes")


def sanitize_llm_response(response: str) -> str:
    """
    ✅ SECURITY FIX: Removes potentially dangerous content from LLM response.
    Prevents XSS and code injection from malicious LLM outputs.
    
    Args:
        response: Raw response from LLM
    
    Returns:
        Sanitized response safe to return to frontend
    """
    if not response:
        return ""
    
    # ✅ SECURITY FIX: Remove XSS vectors
    xss_patterns = [
        (r'<script[^>]*>.*?</script>', ''),
        (r'javascript:', ''),
        (r'on\w+\s*=\s*["\']?[^"\'>\s]*', ''),
        (r'<iframe[^>]*>.*?</iframe>', ''),
        (r'<object[^>]*>.*?</object>', ''),
        (r'<embed[^>]*>.*?</embed>', ''),
        (r'<link[^>]*rel=["\']?stylesheet', ''),
    ]
    
    for pattern, _ in xss_patterns:
        response = re.sub(pattern, '', response, flags=re.IGNORECASE | re.DOTALL)
    
    # Remove suspicious HTML comments with encoded attacks
    response = re.sub(r'<!--.*?-->', '', response, flags=re.DOTALL)
    
    # Remove data URIs that could contain XSS
    response = re.sub(r'data:[^,]*,', '', response)
    
    return response.strip()


def validate_and_sanitize_code_output(output: str) -> str:
    """
    ✅ SECURITY FIX: Validates and sanitizes code returned by LLM.
    Ensures generated code doesn't contain XSS or injection payloads.
    
    Args:
        output: Generated code from LLM
    
    Returns:
        Validated and sanitized code
    
    Raises:
        CodeValidationError: If generated code is suspicious
    """
    output = output.strip()
    
    # Remove code fences if present
    output = re.sub(r'^```\w*\n?', '', output)
    output = re.sub(r'\n?```$', '', output)
    
    # Basic syntax check - should look like code
    if len(output) < 3:
        raise CodeValidationError("Generated code too short or empty")
    
    # Check for XSS patterns
    xss_check = re.findall(r'<script|javascript:|on\w+=', output, re.IGNORECASE)
    if xss_check:
        raise CodeValidationError(f"Generated code contains XSS vectors: {xss_check}")
    
    # Validate suspicious character density
    # Allow typical code punctuation: = + - * / ( ) { } [ ] , . ; : < > ! & | % $ @ #
    dangerous_chars_only = len(
        re.sub(r'[a-zA-Z0-9_\s\-\+\*/%=<>!&|()[\]{};:.,\'"`\\\n\t]', '', output)
    )
    if dangerous_chars_only > len(output) * 0.5:
        raise CodeValidationError("Generated code contains suspicious character patterns")
    
    # Final sanitization
    return sanitize_llm_response(output)
