import time

import httpx

REPO = "chku3401/idp-platform-demo"
CACHE_TTL_SECONDS = 60

_cache: dict[str, dict] = {}


def get_ci_status(service_name: str) -> dict:
    cached = _cache.get(service_name)
    if cached and time.time() - cached["fetched_at"] < CACHE_TTL_SECONDS:
        return cached["data"]

    url = f"https://api.github.com/repos/{REPO}/actions/workflows/{service_name}.yaml/runs"
    try:
        response = httpx.get(url, params={"per_page": 1}, timeout=5)
        response.raise_for_status()
        runs = response.json().get("workflow_runs", [])
    except httpx.HTTPError as exc:
        data = {"available": False, "error": str(exc)}
        _cache[service_name] = {"data": data, "fetched_at": time.time()}
        return data

    if not runs:
        data = {"available": False, "error": "no workflow runs yet"}
    else:
        run = runs[0]
        data = {
            "available": True,
            "status": run["status"],
            "conclusion": run["conclusion"],
            "html_url": run["html_url"],
            "created_at": run["created_at"],
        }

    _cache[service_name] = {"data": data, "fetched_at": time.time()}
    return data
