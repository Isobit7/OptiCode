import os
import pytest
from fastapi.testclient import TestClient

os.environ["TESTING"] = "1"
from app.main import app

client = TestClient(app)


def test_create_and_fetch_shared_review():
    payload = {
        "input_code": "def hello(): print('world')",
        "language": "python",
        "analysis_type": "explain",
        "result_json": {
            "explanation": "Prints hello world in Python",
            "detected_language": "python"
        },
        "visibility": "public"
    }

    # 1. Create Share Link
    res = client.post("/api/shared-reviews", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "slug" in data
    assert "share_url" in data
    assert data["analysis_type"] == "explain"
    slug = data["slug"]

    # 2. Fetch Share Link Detail
    res_get = client.get(f"/api/shared-reviews/{slug}")
    assert res_get.status_code == 200
    get_data = res_get.json()
    assert get_data["input_code"] == payload["input_code"]
    assert get_data["result_json"]["explanation"] == "Prints hello world in Python"


def test_fetch_non_existent_share_link():
    res = client.get("/api/shared-reviews/invalid_slug_999")
    assert res.status_code == 404
