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
    assert (base / "gitops" / "application.yaml").exists()
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


def test_rejects_bad_language(cleanup):
    with pytest.raises(ServiceGenerationError):
        generate_service("test-bad-lang", "payments", "python", "payments-dev")


def test_rejects_bad_service_name(cleanup):
    with pytest.raises(ServiceGenerationError):
        generate_service("Bad_Name!", "payments", "node", "payments-dev")


def test_rejects_duplicate_service(cleanup):
    cleanup.append("test-dup-svc")
    generate_service("test-dup-svc", "payments", "node", "payments-dev")
    with pytest.raises(ServiceExistsError):
        generate_service("test-dup-svc", "payments", "node", "payments-dev")
