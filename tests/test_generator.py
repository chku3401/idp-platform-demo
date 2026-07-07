import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

import pytest

from idp_platform.generator import (
    GENERATED_DIR,
    ServiceExistsError,
    ServiceGenerationError,
    generate_service,
    list_services,
)


@pytest.fixture
def cleanup():
    created = []
    yield created
    for name in created:
        shutil.rmtree(GENERATED_DIR / name, ignore_errors=True)
        wf = REPO_ROOT / ".github" / "workflows" / f"{name}.yaml"
        wf.unlink(missing_ok=True)


def test_generate_node_service(cleanup):
    cleanup.append("test-node-svc")
    result = generate_service("test-node-svc", "payments", "node", "payments-dev")

    base = GENERATED_DIR / "test-node-svc"
    assert (base / "Dockerfile").exists()
    assert (base / "package.json").exists()
    assert (base / "index.js").exists()
    assert "test-node-svc" in (base / "package.json").read_text()
    assert (base / "helm" / "values.yaml").exists()
    assert (REPO_ROOT / ".github" / "workflows" / "test-node-svc.yaml").exists()
    assert result["language"] == "node"


def test_generate_java_service(cleanup):
    cleanup.append("test-java-svc")
    result = generate_service("test-java-svc", "orders", "java", "orders-dev")

    base = GENERATED_DIR / "test-java-svc"
    assert (base / "pom.xml").exists()
    assert "test-java-svc" in (base / "pom.xml").read_text()
    assert (base / "src" / "main" / "java" / "com" / "example" / "service" / "Application.java").exists()
    assert result["language"] == "java"


def test_generate_python_service(cleanup):
    cleanup.append("test-python-svc")
    result = generate_service("test-python-svc", "search", "python", "search-dev")

    base = GENERATED_DIR / "test-python-svc"
    assert (base / "Dockerfile").exists()
    assert (base / "requirements.txt").exists()
    assert (base / "main.py").exists()
    assert "test-python-svc" in (base / "main.py").read_text()
    assert (base / "tests" / "test_health.py").exists()
    assert (base / "helm" / "values.yaml").exists()
    assert (REPO_ROOT / ".github" / "workflows" / "test-python-svc.yaml").exists()
    assert result["language"] == "python"


def test_rejects_bad_language(cleanup):
    with pytest.raises(ServiceGenerationError):
        generate_service("test-bad-lang", "payments", "ruby", "payments-dev")


def test_rejects_bad_service_name(cleanup):
    with pytest.raises(ServiceGenerationError):
        generate_service("Bad_Name!", "payments", "node", "payments-dev")


def test_rejects_duplicate_service(cleanup):
    cleanup.append("test-dup-svc")
    generate_service("test-dup-svc", "payments", "node", "payments-dev")
    with pytest.raises(ServiceExistsError):
        generate_service("test-dup-svc", "payments", "node", "payments-dev")


def test_list_services_reports_generated_service(cleanup):
    cleanup.append("test-list-svc")
    generate_service("test-list-svc", "billing", "java", "billing-dev")

    entries = {s["service_name"]: s for s in list_services()}
    assert "test-list-svc" in entries
    entry = entries["test-list-svc"]
    assert entry["team"] == "billing"
    assert entry["namespace"] == "billing-dev"
    assert entry["language"] == "java"
