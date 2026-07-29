import os
import uuid
os.environ["TESTING"] = "1"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "code-optimizer-explainer-api" in data["service"]


def test_explain_route_default_beginner():
    response = client.post(
        "/api/explain",
        json={"code": "def hello(): print('world')", "language": "python"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "explanation" in data
    assert data["detected_language"] == "python"
    assert data["depth_level"] == "beginner"


def test_explain_route_advanced_depth():
    response = client.post(
        "/api/explain",
        json={
            "code": "def fib(n):\n    return n if n <= 1 else fib(n-1) + fib(n-2)",
            "language": "python",
            "depth": "advanced"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["depth_level"] == "advanced"


def test_humanize_route_modes():
    response = client.post(
        "/api/humanize",
        json={
            "code": "const x = (a, b) => a + b;",
            "language": "javascript",
            "mode": "simplify"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "humanized_code" in data
    assert data["mode_used"] == "simplify"


def test_alternatives_route():
    response = client.post(
        "/api/alternatives",
        json={
            "code": "numbers = [1, 2, 3, 4]\nres = []\nfor n in numbers:\n    res.append(n * 2)",
            "language": "python"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "alternatives" in data
    assert isinstance(data["alternatives"], list)
    if len(data["alternatives"]) > 0:
        first = data["alternatives"][0]
        assert "code" in first
        assert "tradeoff" in first
        assert "name" in first


def test_prettify_route():
    response = client.post(
        "/api/prettify",
        json={"code": "def foo():bar=1;return bar", "language": "python"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "formatted_code" in data


def test_shorten_route():
    response = client.post(
        "/api/shorten",
        json={"code": "# docstring comment\ndef foo():\n    # another comment\n    return 42", "language": "python"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "shortened_code" in data


def test_seo_optimize_route_scoring():
    html_sample = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test Page</title>
    <meta name="description" content="Sample test description">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <main>
        <h1>Main Heading</h1>
        <img src="test.jpg" alt="Test image">
    </main>
</body>
</html>"""
    response = client.post("/api/seo-optimize", json={"code": html_sample})
    assert response.status_code == 200
    data = response.json()
    assert "score" in data
    assert data["score"] == 100
    assert isinstance(data["checklist"], list)
    assert len(data["checklist"]) > 0


def test_line_count_exceeded():
    long_code = "\n".join(["# line"] * 5005)
    response = client.post(
        "/api/explain",
        json={"code": long_code, "language": "python"}
    )
    assert response.status_code == 400
    assert "exceeds maximum allowed limit" in response.json()["detail"]


# --- Authentication & Database Session / Cookie Tests ---

def test_auth_register_db_cookies():
    test_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    reg_payload = {
        "email": test_email,
        "password": "SecretPassword123",
        "full_name": "Test User",
    }
    response = client.post("/api/auth/register", json=reg_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "session_token" in data
    assert data["email"] == test_email
    assert data["user"]["full_name"] == "Test User"
    assert data["session_info"]["session_token"] == data["session_token"]

    # Verify duplicate email registration returns 400
    dup_response = client.post("/api/auth/register", json=reg_payload)
    assert dup_response.status_code == 400
    assert "already exists" in dup_response.json()["detail"]


def test_auth_login_db_cookies():
    test_email = f"loginuser_{uuid.uuid4().hex[:8]}@example.com"
    # 1. Register user
    reg_payload = {
        "email": test_email,
        "password": "SecretPassword123",
        "full_name": "Login User",
    }
    client.post("/api/auth/register", json=reg_payload)

    # 2. Login with correct password
    login_payload = {
        "email": test_email,
        "password": "SecretPassword123",
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "session_token" in data
    assert data["auth_provider"] == "email"
    assert data["user"]["email"] == test_email
    assert "session_token" in response.cookies

    # 3. Login with WRONG password returns 400
    wrong_pass_payload = {
        "email": test_email,
        "password": "WrongPassword999",
    }
    err_response = client.post("/api/auth/login", json=wrong_pass_payload)
    assert err_response.status_code == 400
    assert "Invalid email or password" in err_response.json()["detail"]


def test_auth_google_login_db_cookies():
    test_email = f"googleuser_{uuid.uuid4().hex[:8]}@example.com"
    google_payload = {
        "email": test_email,
        "full_name": "Alex Google",
        "avatar_url": "https://lh3.googleusercontent.com/photo.jpg",
        "id_token": "mock_google_id_token_12345",
    }
    response = client.post("/api/auth/google", json=google_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["auth_provider"] == "google"
    assert data["email"] == test_email
    assert data["user"]["full_name"] == "Alex Google"
    assert data["user"]["avatar_url"] == "https://lh3.googleusercontent.com/photo.jpg"
    assert "session_token" in response.cookies


def test_auth_session_me_lookup():
    # 1. Register & Login user to establish session
    email = f"sessionuser_{uuid.uuid4().hex[:8]}@example.com"
    password = "SecretPassword123"
    client.post("/api/auth/register", json={"email": email, "password": password})
    login_resp = client.post("/api/auth/login", json={"email": email, "password": password})
    session_token = login_resp.json()["session_token"]

    # 2. Query /api/auth/me using Bearer token
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {session_token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == email

    # 3. Query /api/auth/session using Cookie
    sess_resp = client.get("/api/auth/session", cookies={"session_token": session_token})
    assert sess_resp.status_code == 200
    assert sess_resp.json()["email"] == email


def test_auth_logout_clears_cookies():
    # 1. Register & Login first
    email = f"logoutuser_{uuid.uuid4().hex[:8]}@example.com"
    password = "SecretPassword123"
    client.post("/api/auth/register", json={"email": email, "password": password})
    login_resp = client.post("/api/auth/login", json={"email": email, "password": password})
    session_token = login_resp.json()["session_token"]

    # 2. Logout
    logout_resp = client.post("/api/auth/logout", cookies={"session_token": session_token})
    assert logout_resp.status_code == 200
    assert logout_resp.json()["status"] == "success"

    # Verify session is invalidated
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {session_token}"})
    assert me_resp.status_code == 401


# --- Upgrade Features Endpoint Tests ---

def test_security_audit_endpoint():
    code_with_secret = 'API_KEY = "sk-1234567890abcdef1234567890abcdef"\ndef query_db(user_id):\n    return f"SELECT * FROM users WHERE id = {user_id}"\n'
    response = client.post("/api/security-audit", json={"code": code_with_secret, "language": "python"})
    assert response.status_code == 200
    data = response.json()
    assert "grade" in data
    assert "score" in data
    assert data["secrets_found"] > 0
    assert "sanitized_code" in data


def test_translate_endpoint():
    py_code = "def add(a, b):\n    return a + b\n"
    response = client.post("/api/translate", json={"code": py_code, "language": "python", "target_language": "TypeScript"})
    assert response.status_code == 200
    data = response.json()
    assert "translated_code" in data
    assert data["target_language"] == "TypeScript"


def test_pr_review_endpoint():
    code = "def process_payment(amount):\n    return True\n"
    response = client.post("/api/pr-review", json={"code": code, "language": "python", "pr_title": "Add payment logic"})
    assert response.status_code == 200
    data = response.json()
    assert "github_markdown" in data
    assert "summary" in data


def test_flowchart_endpoint():
    code = "if x > 10:\n    print('High')\nelse:\n    print('Low')\n"
    response = client.post("/api/flowchart", json={"code": code, "language": "python"})
    assert response.status_code == 200
    data = response.json()
    assert "mermaid_code" in data
    assert "graph TD" in data["mermaid_code"]

