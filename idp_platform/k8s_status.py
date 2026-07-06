import json
import os
import subprocess

KUBE_CONTEXT = os.environ.get("IDP_KUBE_CONTEXT", "kind-idp-demo")


class ClusterUnavailableError(RuntimeError):
    pass


def _kubectl(*args: str) -> str:
    result = subprocess.run(
        ["kubectl", "--context", KUBE_CONTEXT, *args],
        capture_output=True, text=True, timeout=10,
    )
    if result.returncode != 0:
        raise ClusterUnavailableError(result.stderr.strip())
    return result.stdout


def _kubectl_json(*args: str) -> dict:
    return json.loads(_kubectl(*args, "-o", "json"))


def get_service_status(service_name: str, namespace: str) -> dict:
    status = {"service": service_name, "namespace": namespace, "cluster_reachable": True}

    try:
        deploy = _kubectl_json("-n", namespace, "get", "deployment", service_name)
    except (ClusterUnavailableError, json.JSONDecodeError) as exc:
        status["cluster_reachable"] = False
        status["error"] = str(exc)
        return status

    d_status = deploy.get("status", {})
    status["replicas"] = {
        "desired": deploy.get("spec", {}).get("replicas", 0),
        "ready": d_status.get("readyReplicas", 0),
        "available": d_status.get("availableReplicas", 0),
        "updated": d_status.get("updatedReplicas", 0),
    }

    pods_raw = _kubectl_json("-n", namespace, "get", "pods", "-l", f"app={service_name}")
    pods = []
    for item in pods_raw.get("items", []):
        container_statuses = item.get("status", {}).get("containerStatuses", [])
        ready_count = sum(1 for c in container_statuses if c.get("ready"))
        restarts = sum(c.get("restartCount", 0) for c in container_statuses)
        pods.append({
            "name": item["metadata"]["name"],
            "phase": item.get("status", {}).get("phase"),
            "ready": f"{ready_count}/{len(container_statuses)}",
            "restarts": restarts,
            "started_at": item.get("status", {}).get("startTime"),
        })
    status["pods"] = pods

    try:
        top_output = _kubectl("-n", namespace, "top", "pods", "-l", f"app={service_name}", "--no-headers")
        metrics = []
        for line in top_output.strip().splitlines():
            parts = line.split()
            if len(parts) >= 3:
                metrics.append({"pod": parts[0], "cpu": parts[1], "memory": parts[2]})
        status["metrics"] = metrics
    except ClusterUnavailableError:
        status["metrics"] = None

    try:
        app = _kubectl_json("-n", "argocd", "get", "application", service_name)
        status["argocd"] = {
            "sync_status": app.get("status", {}).get("sync", {}).get("status"),
            "health_status": app.get("status", {}).get("health", {}).get("status"),
        }
    except ClusterUnavailableError:
        status["argocd"] = None

    return status
