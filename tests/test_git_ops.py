import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from idp_platform.git_ops import commit_and_push


def _git(cwd, *args):
    subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, text=True)


def test_commit_and_push_against_local_remote(tmp_path):
    bare = tmp_path / "origin.git"
    bare.mkdir()
    _git(bare, "init", "--bare", "-b", "main")

    work = tmp_path / "work"
    work.mkdir()
    _git(work, "init", "-b", "main")
    _git(work, "config", "user.email", "test@example.com")
    _git(work, "config", "user.name", "Test")
    _git(work, "remote", "add", "origin", str(bare))

    (work / "README.md").write_text("hello\n")
    _git(work, "add", "README.md")
    _git(work, "commit", "-m", "init")
    _git(work, "push", "origin", "main")

    (work / "generated.txt").write_text("service scaffold\n")
    result = commit_and_push(work, paths=["generated.txt"], message="Onboard service: demo")

    assert result["committed"] is True
    assert result["pushed"] is True
    assert result["branch"] == "main"

    clone = tmp_path / "clone"
    _git(tmp_path, "clone", str(bare), str(clone))
    assert (clone / "generated.txt").exists()


def test_commit_and_push_no_changes_returns_noop(tmp_path):
    bare = tmp_path / "origin.git"
    bare.mkdir()
    _git(bare, "init", "--bare", "-b", "main")

    work = tmp_path / "work"
    work.mkdir()
    _git(work, "init", "-b", "main")
    _git(work, "config", "user.email", "test@example.com")
    _git(work, "config", "user.name", "Test")
    _git(work, "remote", "add", "origin", str(bare))

    (work / "README.md").write_text("hello\n")
    _git(work, "add", "README.md")
    _git(work, "commit", "-m", "init")
    _git(work, "push", "origin", "main")

    result = commit_and_push(work, paths=["README.md"], message="no-op")
    assert result == {"committed": False, "pushed": False, "reason": "nothing to commit"}
