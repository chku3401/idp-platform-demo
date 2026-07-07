from fastapi import FastAPI

app = FastAPI(title="__SERVICE_NAME__")


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/")
def root():
    return {"service": "__SERVICE_NAME__", "team": "__TEAM__"}
