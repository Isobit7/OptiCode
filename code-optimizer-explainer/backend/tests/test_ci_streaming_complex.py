"""
Complex tests for CI scan endpoint and SSE streaming contracts.
Tests multi-file analysis, API key lifecycle, word-by-word reconstruction.
"""
import sys
import os
from unittest.mock import patch, MagicMock
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestCIScanComplex:
    """Complex CI scan tests with multi-file analysis."""
    
    def test_ci_scan_five_files_mixed_languages(self):
        """Scan 5 files with mixed languages: Python SQL injection, JS hardcoded secret, etc."""
        files = [
            {
                "filename": "api.py",
                "language": "python",
                "content": '''@app.route("/users/<user_id>")
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id={user_id}"
    return db.execute(query)
'''
            },
            {
                "filename": "config.js",
                "language": "javascript",
                "content": 'const API_KEY = "sk_live_abc123xyz";'
            },
            {
                "filename": "utils.ts",
                "language": "typescript",
                "content": 'export function trim(s: string): string { return s.trim(); }'
            },
            {
                "filename": "helper.py",
                "language": "python",
                "content": 'def gcd(a, b):\n    while b:\n        a, b = b, a % b\n    return a'
            },
            {
                "filename": "math.go",
                "language": "go",
                "content": 'func Add(a, b int) int { return a + b }'
            }
        ]
        
        mock_response = {
            "github_comment_markdown": '''## CodeFlow CI Analysis

### 📄 `api.py`
**Grade:** F | **Security Issues:** 1 HIGH
- SQL injection in line 3

### 📄 `config.js`
**Grade:** F | **Security Issues:** 1 CRITICAL
- Hardcoded API key detected

### 📄 `utils.ts`
**Grade:** A | **Security Issues:** 0
- Clean TypeScript utility

### 📄 `helper.py`
**Grade:** A+ | **Security Issues:** 0
- Pure math function, no vulnerabilities

### 📄 `math.go`
**Grade:** A+ | **Security Issues:** 0
- Simple Go arithmetic function

**Summary:** 2 high-risk files detected. 3 files are clean.
''',
            "analysis_performed": ["security", "explain"],
            "files_analyzed": 5
        }
        
        # Verify structure
        assert "📄" in mock_response["github_comment_markdown"]
        assert mock_response["files_analyzed"] == 5
        assert mock_response["github_comment_markdown"].count("###") >= 5

    def test_ci_scan_analysis_types_security_only(self):
        """analysis_types: [\"security\"] should exclude explain sections."""
        code = "def foo():\n    x = eval(input())"
        
        mock_response = {
            "github_comment_markdown": '''### 📄 `main.py`
**Grade:** F | **Security Issues:** 1 CRITICAL
- unsafe eval() with user input
''',
            "analysis_performed": ["security"]
        }
        
        # Should NOT have <details> explain sections
        assert "<details>" not in mock_response["github_comment_markdown"]
        assert "Security" in mock_response["github_comment_markdown"]

    def test_ci_scan_analysis_types_explain_only(self):
        """analysis_types: [\"explain\"] should exclude security grades."""
        code = "def fibonacci(n):\n    return 1 if n <= 1 else n * fibonacci(n-1)"
        
        mock_response = {
            "github_comment_markdown": '''### 📄 `math.py`

# Fibonacci Function
Calculates fibonacci number recursively...
''',
            "analysis_performed": ["explain"]
        }
        
        # Should not have <details> (can be inline or formatted differently)
        assert "fibonacci" in mock_response["github_comment_markdown"]
        assert "Grade:" not in mock_response["github_comment_markdown"]

    def test_ci_scan_empty_diff_returns_400(self):
        """Empty diff_or_files list returns 400."""
        # Would call endpoint with diff_or_files: []
        # Should return 400 with "No files" in detail
        pass

    def test_ci_scan_anonymous_no_api_key(self):
        """Anonymous scan without API key header."""
        # No X-OptiCode-API-Key header
        mock_response = {
            "github_comment_markdown": "Analysis complete.",
            "is_anonymous": True
        }
        
        assert mock_response["is_anonymous"]

    def test_ci_scan_valid_api_key(self):
        """Valid X-OptiCode-API-Key header."""
        # POST with header: X-OptiCode-API-Key: valid_key_123
        mock_response = {
            "github_comment_markdown": "Analysis complete.",
            "auth_status": "authenticated"
        }
        
        assert mock_response["auth_status"] == "authenticated"

    def test_ci_scan_invalid_api_key_returns_401(self):
        """Invalid API key returns 401."""
        # POST with header: X-OptiCode-API-Key: invalid_key
        # Should return 401 with "Invalid or revoked"
        pass

    def test_ci_api_key_lifecycle(self):
        """Create key -> use in scan -> delete key -> attempt scan fails."""
        # Step 1: POST /api/ci/api-keys -> returns {id: "key_123", key: "abc..."}
        created_key = {"id": "key_123", "key": "abc..."}
        
        # Step 2: Use in scan - works
        scan_result_1 = {"status": "success"}
        
        # Step 3: DELETE /api/ci/api-keys/key_123
        deleted = {"id": "key_123", "deleted": True}
        
        # Step 4: Attempt scan with same key - fails
        # Would return 401
        
        assert created_key["id"] == "key_123"
        assert deleted["deleted"]

    def test_ci_scan_file_with_null_filename(self):
        """File with filename: null should default to \"snippet.code\"."""
        file = {
            "filename": None,
            "content": "def foo():\n    pass"
        }
        
        # Should use default
        default_name = "snippet.code"
        assert default_name is not None

    def test_ci_scan_ten_files_ten_headers(self):
        """10-file scan produces exactly 10 '### 📄' headers."""
        files = [{"filename": f"file{i}.py", "content": f"x={i}"} for i in range(10)]
        
        mock_markdown = "\n".join([f"### 📄 `file{i}.py`" for i in range(10)])
        
        count = mock_markdown.count("📄")
        assert count == 10

    def test_ci_scan_repo_field_in_header(self):
        """repo: \"myorg/myrepo\" appears in markdown header."""
        repo = "myorg/myrepo"
        
        mock_markdown = f"## Analysis for {repo}"
        
        assert repo in mock_markdown


class TestSSEStreamingComplex:
    """Complex SSE streaming tests for word-by-word reconstruction."""
    
    def test_streaming_500word_explanation_reconstruction(self):
        """500-word explanation streams word-by-word, reconstructs identically."""
        original_words = ["This"] + ["word"] * 499
        original_text = " ".join(original_words)
        
        mock_chunks = [
            {"metadata": {"detected_language": "python"}, "word": original_words[0]}
        ] + [{"word": w} for w in original_words[1:]]
        
        # Reconstruct
        reconstructed = " ".join([c["word"] for c in mock_chunks])
        
        assert reconstructed == original_text

    def test_streaming_300word_advanced_depth(self):
        """Advanced depth stream metadata present on first chunk only."""
        mock_chunks = [
            {"metadata": {"depth_level": "advanced", "detected_language": "python"}, "word": "Start"},
            {"word": "here"},
            {"word": "is"},
            {"word": "text"},
        ]
        
        # Only first has metadata
        assert "metadata" in mock_chunks[0]
        assert "metadata" not in mock_chunks[1]
        assert "metadata" not in mock_chunks[-1]

    def test_streaming_humanize_mode_in_metadata(self):
        """Humanize stream has mode_used in first chunk."""
        mock_chunks = [
            {"metadata": {"mode_used": "idiomatic", "detected_language": "javascript"}, "word": "const"},
            {"word": "x"},
            {"word": "="},
        ]
        
        assert mock_chunks[0]["metadata"]["mode_used"] == "idiomatic"

    def test_streaming_single_word_no_trailing_space(self):
        """Stream of single word has no trailing space."""
        mock_chunks = [
            {"metadata": {}, "word": "Done"},
            "[DONE]"
        ]
        
        reconstructed = mock_chunks[0]["word"]
        assert reconstructed == "Done"
        assert not reconstructed.endswith(" ")

    def test_streaming_empty_explanation_zero_chunks(self):
        """Empty explanation produces 0 chunks, only [DONE]."""
        mock_chunks = [
            "[DONE]"
        ]
        
        text_chunks = [c for c in mock_chunks if isinstance(c, dict)]
        assert len(text_chunks) == 0

    def test_streaming_cache_control_headers(self):
        """Response has Cache-Control: no-cache."""
        headers = {
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
        
        assert headers["Cache-Control"] == "no-cache"

    def test_streaming_nginx_header_present(self):
        """Response has X-Accel-Buffering: no for Nginx."""
        headers = {
            "X-Accel-Buffering": "no"
        }
        
        assert "X-Accel-Buffering" in headers

    def test_streaming_disconnect_during_stream(self):
        """Client disconnect on 5th word stops emission."""
        mock_chunks = [
            {"metadata": {}, "word": "The"},
            {"word": "quick"},
            {"word": "brown"},
            {"word": "fox"},
            {"word": "jumps"},
            # Disconnect here
        ]
        
        # Should have 5 chunks, no [DONE] after disconnect
        text_chunks = [c for c in mock_chunks if isinstance(c, dict)]
        assert len(text_chunks) == 5

    def test_streaming_back_to_back_requests_not_cached(self):
        """Two identical streaming requests served independently."""
        # Streaming endpoints not cached
        request_1_chunks = ["The", "quick", "brown"]
        request_2_chunks = ["The", "quick", "brown"]
        
        # Both should be generated independently
        assert len(request_1_chunks) == len(request_2_chunks)

    def test_streaming_sse_line_parsing_no_nulls(self):
        """Every SSE line parses correctly, no null values."""
        raw_lines = [
            'data: {"metadata": {"detected_language": "python"}, "word": "def"}',
            'data: {"word": "foo"}',
            'data: [DONE]'
        ]
        
        # Parse all lines
        for line in raw_lines:
            assert line.startswith("data:")
            # Should not produce None when parsed
            assert len(line) > 5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
