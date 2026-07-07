from fastapi import FastAPI

app = FastAPI(title="automation-api")


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/")
def root():
    return {"service": "automation-api", "team": "auto"}
