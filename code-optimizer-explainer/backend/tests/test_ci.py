import os
import pytest
from fastapi.testclient import TestClient

os.environ["TESTING"] = "1"
from app.main import app

client = TestClient(app)


def test_api_key_creation_and_revocation():
    # 1. Create API key
    res = client.post("/api/ci/api-keys", json={"name": "Test Repo Key"})
    assert res.status_code == 200
    data = res.json()
    assert "key" in data
    assert data["key"].startswith("opti_")
    key_id = data["id"]
    raw_key = data["key"]

    # 2. Run CI Scan with generated API Key
    scan_payload = {
        "diff_or_files": [
            {
                "filename": "app/auth.py",
                "code": "API_SECRET = '12345-secret-token'\ndef login(): pass",
                "language": "python"
            }
        ],
        "analysis_types": ["security", "explain"],
        "repo": "owner/test-repo"
    }

    scan_res = client.post(
        "/api/ci/scan",
        json=scan_payload,
        headers={"X-OptiCode-API-Key": raw_key}
    )
    assert scan_res.status_code == 200
    scan_data = scan_res.json()
    assert "github_comment_markdown" in scan_data
    assert "OptiCode Automated CI Review Summary" in scan_data["github_comment_markdown"]

    # 3. Revoke Key
    del_res = client.delete(f"/api/ci/api-keys/{key_id}")
    assert del_res.status_code == 200
