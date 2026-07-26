import os
import pytest
from fastapi.testclient import TestClient

os.environ["TESTING"] = "1"
from app.main import app

client = TestClient(app)


def test_identical_diff_story():
    payload = {
        "before_code": "def test(): return 123",
        "after_code": "def test(): return 123",
        "language": "python"
    }
    res = client.post("/api/diff-story", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "No functional code changes" in data["summary"]


def test_modified_diff_story():
    payload = {
        "before_code": "def add(a, b): return a + b",
        "after_code": "def add(a: int, b: int) -> int:\n    \"\"\"Adds two numbers safely.\"\"\"\n    return int(a) + int(b)",
        "language": "python"
    }
    res = client.post("/api/diff-story", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "key_changes" in data
    assert "reasoning" in data
