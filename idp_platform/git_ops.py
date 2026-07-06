import subprocess
from pathlib import Path


class GitAutomationError(RuntimeError):
    pass


def _run(repo_root: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args], cwd=repo_root, capture_output=True, text=True, check=False
    )


def commit_and_push(repo_root: Path, paths: list[str], message: str) -> dict:
    add = _run(repo_root, "add", *paths)
    if add.returncode != 0:
        raise GitAutomationError(f"git add failed: {add.stderr.strip()}")

    status = _run(repo_root, "status", "--porcelain", *paths)
    if not status.stdout.strip():
        return {"committed": False, "pushed": False, "reason": "nothing to commit"}

    commit = _run(repo_root, "commit", "-m", message)
    if commit.returncode != 0:
        raise GitAutomationError(f"git commit failed: {commit.stderr.strip()}")

    branch = _run(repo_root, "rev-parse", "--abbrev-ref", "HEAD").stdout.strip()
    push = _run(repo_root, "push", "origin", branch)
    if push.returncode != 0:
        raise GitAutomationError(f"git push failed: {push.stderr.strip()}")

    sha = _run(repo_root, "rev-parse", "HEAD").stdout.strip()
    return {"committed": True, "pushed": True, "branch": branch, "commit": sha}
