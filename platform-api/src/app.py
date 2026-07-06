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
)

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

    return {
        "message": "Service onboarding request accepted",
        **result,
    }


app.mount("/", StaticFiles(directory=REPO_ROOT / "platform-ui", html=True), name="ui")
