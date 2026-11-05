"""Apply the reviewed Gateway overlay only to the pinned, unmodified inputs."""
from pathlib import Path
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parent
repo = root / "switch"
overlay = root / "gateway-ui"
manifest = json.loads((overlay / "manifest.json").read_text())
def digest(data):
    return hashlib.sha256(data.replace(b"\r\n", b"\n").rstrip(b"\n")).hexdigest()
head = subprocess.check_output(["git", "-c", "safe.directory=" + repo.as_posix(), "-C", str(repo), "rev-parse", "HEAD"], text=True).strip()
if head != manifest["baseCommit"]:
    raise SystemExit("Gateway overlay requires the pinned Switch revision.")
pending = []
for entry in manifest["files"]:
    destination = (repo / entry["path"]).resolve()
    source = (overlay / entry["overlay"]).resolve()
    if not destination.is_relative_to(repo.resolve() / "gateway" / "src") or not source.is_relative_to(overlay.resolve()):
        raise SystemExit("Unexpected overlay path.")
    data = source.read_bytes()
    if digest(data) != entry["after"]:
        raise SystemExit("Overlay checksum mismatch: " + entry["path"])
    current = digest(destination.read_bytes()) if destination.exists() else None
    if current == entry["after"]:
        continue
    if current != entry["before"]:
        raise SystemExit("Refusing to overwrite local edits: " + entry["path"])
    pending.append((destination, data))
for destination, data in pending:
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
print("Gateway UI overlay verified; applied " + str(len(pending)) + " file(s).")
