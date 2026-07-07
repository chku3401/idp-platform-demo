import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from idp_platform.generator import (
    ServiceExistsError,
    ServiceGenerationError,
    generate_service,
    list_services,
)
from idp_platform.ci_status import get_ci_status
from idp_platform.git_ops import GitAutomationError, commit_and_push
from idp_platform.k8s_status import get_service_status

GIT_AUTOMATION_ENABLED = os.environ.get("IDP_GIT_AUTOMATION") == "1"

app = FastAPI(title="IDP Platform API")


class ServiceRequest(BaseModel):
    service_name: str
    team: str
    language: str
    namespace: str
    database: bool = False
    kafka: bool = False
    redis: bool = False


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/services")
def get_services():
    return {"services": list_services()}


@app.get("/services/{service_name}/status")
def service_status(service_name: str):
    services = {s["service_name"]: s for s in list_services()}
    if service_name not in services:
        raise HTTPException(status_code=404, detail=f"Unknown service '{service_name}'")
    status = get_service_status(service_name, services[service_name]["namespace"])
    status["ci"] = get_ci_status(service_name)
    return status


@app.post("/services", status_code=201)
def create_service(request: ServiceRequest):
    try:
        result = generate_service(
            service_name=request.service_name,
            team=request.team,
            language=request.language,
            namespace=request.namespace,
        )
    except ServiceGenerationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ServiceExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    git_result = {"committed": False, "pushed": False, "reason": "automation disabled"}
    if GIT_AUTOMATION_ENABLED:
        workflow_path = f".github/workflows/{request.service_name}.yaml"
        try:
            git_result = commit_and_push(
                REPO_ROOT,
                paths=[result["path"], workflow_path],
                message=f"Onboard service: {request.service_name} (team: {request.team})",
            )
        except GitAutomationError as exc:
            git_result = {"committed": False, "pushed": False, "error": str(exc)}

    return {
        "message": "Service onboarding request accepted",
        "git": git_result,
        **result,
    }


app.mount("/", StaticFiles(directory=REPO_ROOT / "platform-ui", html=True), name="ui")
