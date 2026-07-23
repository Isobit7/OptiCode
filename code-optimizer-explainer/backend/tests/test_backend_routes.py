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
