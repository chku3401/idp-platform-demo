import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "platform-api" / "src"))
sys.path.insert(0, str(REPO_ROOT))

import pytest
from fastapi.testclient import TestClient

from idp_platform.generator import GENERATED_DIR
from app import app

client = TestClient(app)


@pytest.fixture
def cleanup():
    created = []
    yield created
    for name in created:
        shutil.rmtree(GENERATED_DIR / name, ignore_errors=True)
        wf = REPO_ROOT / ".github" / "workflows" / f"{name}.yaml"
        wf.unlink(missing_ok=True)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "healthy"}


def test_create_service_writes_real_files(cleanup):
    cleanup.append("test-api-svc")
    resp = client.post(
        "/services",
        json={
            "service_name": "test-api-svc",
            "team": "payments",
            "language": "node",
            "namespace": "payments-dev",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["service"] == "test-api-svc"
    assert (GENERATED_DIR / "test-api-svc" / "package.json").exists()


def test_create_service_rejects_bad_language(cleanup):
    resp = client.post(
        "/services",
        json={
            "service_name": "test-api-bad",
            "team": "payments",
            "language": "cobol",
            "namespace": "payments-dev",
        },
    )
    assert resp.status_code == 400


def test_create_service_conflict(cleanup):
    cleanup.append("test-api-dup")
    payload = {
        "service_name": "test-api-dup",
        "team": "payments",
        "language": "node",
        "namespace": "payments-dev",
    }
    first = client.post("/services", json=payload)
    assert first.status_code == 201
    second = client.post("/services", json=payload)
    assert second.status_code == 409
