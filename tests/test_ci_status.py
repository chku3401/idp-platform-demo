import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

import httpx

from idp_platform import ci_status


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


def test_get_ci_status_reports_latest_run(monkeypatch):
    ci_status._cache.clear()

    def fake_get(url, params=None, timeout=None):
        return FakeResponse({
            "workflow_runs": [{
                "status": "completed",
                "conclusion": "success",
                "html_url": "https://github.com/chku3401/idp-platform-demo/actions/runs/1",
                "created_at": "2026-01-01T00:00:00Z",
            }]
        })

    monkeypatch.setattr(ci_status.httpx, "get", fake_get)

    result = ci_status.get_ci_status("some-service")
    assert result["available"] is True
    assert result["conclusion"] == "success"


def test_get_ci_status_caches_result(monkeypatch):
    ci_status._cache.clear()
    calls = []

    def fake_get(url, params=None, timeout=None):
        calls.append(1)
        return FakeResponse({"workflow_runs": []})

    monkeypatch.setattr(ci_status.httpx, "get", fake_get)

    ci_status.get_ci_status("cached-service")
    ci_status.get_ci_status("cached-service")
    assert len(calls) == 1


def test_get_ci_status_handles_no_runs(monkeypatch):
    ci_status._cache.clear()

    def fake_get(url, params=None, timeout=None):
        return FakeResponse({"workflow_runs": []})

    monkeypatch.setattr(ci_status.httpx, "get", fake_get)

    result = ci_status.get_ci_status("no-runs-service")
    assert result["available"] is False


def test_get_ci_status_handles_http_error(monkeypatch):
    ci_status._cache.clear()

    def fake_get(url, params=None, timeout=None):
        raise httpx.HTTPError("boom")

    monkeypatch.setattr(ci_status.httpx, "get", fake_get)

    result = ci_status.get_ci_status("error-service")
    assert result["available"] is False
    assert "boom" in result["error"]
