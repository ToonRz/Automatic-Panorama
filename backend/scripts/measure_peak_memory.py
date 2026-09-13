"""Measure the backend's peak resident memory on a Render-Free-shaped container.

docs/deployment-plan.md section 7 / task-plans/09b-memory-budget.md.

No Dockerfile is added. Each run starts a fresh, unmodified `python:3.12-slim`
container with the repository bind-mounted read-only, capped with
``--memory=512m --memory-swap=512m``, and given the same install command,
start command, and environment ``render.yaml`` uses. It posts a synthetic
overlapping pan generated in this process -- no photo is ever committed --
and reads the peak from the container's cgroup (``memory.peak`` on cgroup v2,
falling back to ``memory.max_usage_in_bytes`` on cgroup v1), which records the
true high-water mark rather than a `docker stats` sample that can miss a
spike between polls. An OOM-killed container is reported as a failure, not a
number.

Profiles (docs/deployment-plan.md section 7.1):

- ``worst``: ``MAX_UPLOAD_FILES`` frames, each decoded at ``MAX_IMAGE_PIXELS``,
  compactly encoded so the request still clears ``MAX_UPLOAD_MB`` and
  ``MAX_TOTAL_UPLOAD_MB`` -- the decode-bomb shape those settings exist to
  admit.
- ``normal``: three frames already downscaled to the per-request input budget
  for three images, matching what the frontend prepares before upload (08c).

Each profile runs three times by default and keeps the highest peak, per the
task's acceptance criteria.

Usage::

    python backend/scripts/measure_peak_memory.py
    python backend/scripts/measure_peak_memory.py --profile worst --runs 3
    python backend/scripts/measure_peak_memory.py --output /tmp/09b-results.json

Requires local Docker with network access to pull ``python:3.12-slim`` and to
``pip install`` the backend's dependencies inside the container -- both are
plain outbound HTTPS, so this cannot run inside a sandbox that blocks the
Docker Hub CDN or PyPI. If Docker (or that network access) is unavailable,
this script fails fast rather than inventing a number; do not hand-edit a
peak into docs/deployment-plan.md without a run that actually produced it.
"""

from __future__ import annotations

import argparse
import json
import math
import secrets
import socket
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import httpx
import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
RENDER_YAML = REPO_ROOT / "render.yaml"
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import Settings  # noqa: E402
from app.services.stitcher import input_long_edge_budget  # noqa: E402

IMAGE = "python:3.12-slim"
MEMORY_LIMIT = "512m"
BUDGET_MB = 410
CONTAINER_INTERNAL_PORT = 8000
HEALTH_TIMEOUT_SECONDS = 300.0
STITCH_TIMEOUT_BUFFER_SECONDS = 60.0
JPEG_QUALITY = 85
CGROUP_V2_PEAK = "/sys/fs/cgroup/memory.peak"
CGROUP_V1_PEAK = "/sys/fs/cgroup/memory/memory.max_usage_in_bytes"


def _load_render_env() -> dict[str, str]:
    """Parse render.yaml's flat envVars list, skipping ``sync: false`` entries.

    render.yaml's shape is simple enough (a list of ``{key, value}`` maps)
    that adding a YAML dependency just to read it is not worth it; a
    ``sync: false`` entry has no committed value and is meant to be set on
    the deployed host, not by this script.
    """

    env: dict[str, str] = {}
    pending_key: str | None = None
    for raw_line in RENDER_YAML.read_text().splitlines():
        line = raw_line.strip()
        if line.startswith("- key:"):
            pending_key = line.split(":", 1)[1].strip()
        elif line.startswith("value:") and pending_key is not None:
            env[pending_key] = line.split(":", 1)[1].strip().strip('"')
            pending_key = None
        elif line.startswith("sync:") and pending_key is not None:
            pending_key = None
    return env


def _dimensions_for_pixel_budget(
    pixel_budget: int, aspect: tuple[int, int] = (4, 3)
) -> tuple[int, int]:
    """Largest 4:3 width/height whose product does not exceed ``pixel_budget``."""

    aspect_w, aspect_h = aspect
    height = int(math.sqrt(pixel_budget * aspect_h / aspect_w))
    width = int(height * aspect_w / aspect_h)
    while width * height > pixel_budget:
        height -= 1
        width = int(height * aspect_w / aspect_h)
    return width, height


def _synthetic_pan(
    count: int, width: int, height: int, seed: int, overlap_fraction: float = 0.35
) -> list[np.ndarray]:
    """A deterministic, richly textured overlapping pan of ``count`` frames.

    Built by slicing windows out of one wide textured plane rather than
    ``cv2.warpPerspective``, so generating a worst-case 50 MP-per-frame chain
    stays fast and memory-light on the host running this script.
    """

    rng = np.random.default_rng(seed)
    step = max(1, int(width * (1 - overlap_fraction)))
    world_width = width + step * (count - 1)
    world = np.full((height, world_width, 3), int(rng.integers(150, 210)), dtype=np.uint8)
    for _ in range(2_000):
        color = tuple(int(c) for c in rng.integers(0, 255, size=3))
        pt1 = (int(rng.integers(0, world_width)), int(rng.integers(0, height)))
        side_w = int(rng.integers(40, max(41, world_width // 20)))
        side_h = int(rng.integers(40, max(41, height // 8)))
        pt2 = (min(world_width - 1, pt1[0] + side_w), min(height - 1, pt1[1] + side_h))
        cv2.rectangle(world, pt1, pt2, color, thickness=-1)
    return [world[:, i * step : i * step + width].copy() for i in range(count)]


def _encode_jpeg_frames(frames: list[np.ndarray]) -> list[bytes]:
    encoded = []
    for frame in frames:
        ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
        if not ok:
            raise RuntimeError("failed to encode a synthetic frame as JPEG")
        encoded.append(buf.tobytes())
    return encoded


@dataclass(frozen=True)
class Profile:
    name: str
    frame_count: int
    frame_width: int
    frame_height: int


def _build_profiles(settings: Settings) -> dict[str, Profile]:
    worst_w, worst_h = _dimensions_for_pixel_budget(settings.max_image_pixels)
    normal_edge = input_long_edge_budget(3, settings)
    normal_w, normal_h = normal_edge, int(normal_edge * 3 / 4)
    return {
        "worst": Profile("worst", settings.max_upload_files, worst_w, worst_h),
        "normal": Profile("normal", 3, normal_w, normal_h),
    }


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _docker_available() -> bool:
    result = subprocess.run(["docker", "info"], capture_output=True, text=True)
    return result.returncode == 0


def _start_container(env: dict[str, str], host_port: int) -> str:
    name = f"panorama-mem-{secrets.token_hex(4)}"
    env_args: list[str] = []
    for key, value in env.items():
        env_args += ["-e", f"{key}={value}"]
    start_script = (
        "pip install --quiet -r requirements.txt && "
        "cd backend && exec uvicorn app.main:app --host 0.0.0.0 --port $PORT"
    )
    cmd = [
        "docker", "run", "-d",
        "--name", name,
        "--memory", MEMORY_LIMIT,
        "--memory-swap", MEMORY_LIMIT,
        "-p", f"127.0.0.1:{host_port}:{CONTAINER_INTERNAL_PORT}",
        "-v", f"{REPO_ROOT}:/repo:ro",
        "-w", "/repo",
        *env_args,
        "-e", f"PORT={CONTAINER_INTERNAL_PORT}",
        IMAGE,
        "bash", "-lc", start_script,
    ]
    subprocess.run(cmd, check=True, capture_output=True, text=True)
    return name


def _wait_for_health(port: int, timeout_s: float) -> None:
    deadline = time.monotonic() + timeout_s
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            response = httpx.get(f"http://127.0.0.1:{port}/healthz", timeout=2.0)
            if response.status_code == 200:
                return
        except httpx.HTTPError as exc:  # noqa: PERF203 - polling loop, not a hot path
            last_error = exc
        time.sleep(1.0)
    raise RuntimeError(f"backend did not become healthy within {timeout_s:.0f}s: {last_error}")


def _post_stitch(port: int, frames: list[np.ndarray], timeout_s: float) -> tuple[int, str]:
    files = [
        ("files", (f"frame-{index + 1}.jpg", payload, "image/jpeg"))
        for index, payload in enumerate(_encode_jpeg_frames(frames))
    ]
    with httpx.Client(timeout=timeout_s) as client:
        response = client.post(f"http://127.0.0.1:{port}/api/v1/stitch", files=files)
    return response.status_code, response.text[:2_000]


def _read_peak_bytes(name: str) -> int | None:
    for path in (CGROUP_V2_PEAK, CGROUP_V1_PEAK):
        result = subprocess.run(
            ["docker", "exec", name, "cat", path], capture_output=True, text=True
        )
        if result.returncode == 0:
            try:
                return int(result.stdout.strip())
            except ValueError:
                continue
    return None


def _was_oom_killed(name: str) -> bool:
    result = subprocess.run(
        ["docker", "inspect", name, "--format", "{{.State.OOMKilled}}"],
        capture_output=True,
        text=True,
    )
    return result.stdout.strip() == "true"


def _stop_and_remove(name: str) -> None:
    subprocess.run(["docker", "stop", "-t", "2", name], capture_output=True, text=True)
    subprocess.run(["docker", "rm", "-f", name], capture_output=True, text=True)


@dataclass
class RunResult:
    profile: str
    run: int
    peak_mb: float | None
    oom_killed: bool
    http_status: int | None
    error: str | None = None


@dataclass
class ScriptResult:
    docker_version: str
    python_image: str
    runs: list[RunResult] = field(default_factory=list)


def _single_run(
    profile: Profile, env: dict[str, str], run_index: int, stitch_timeout_s: float
) -> RunResult:
    port = _free_port()
    name = _start_container(env, port)
    try:
        _wait_for_health(port, HEALTH_TIMEOUT_SECONDS)
        frames = _synthetic_pan(
            profile.frame_count, profile.frame_width, profile.frame_height, seed=run_index
        )
        status_code, _body = _post_stitch(port, frames, stitch_timeout_s)
        oom = _was_oom_killed(name)
        peak_bytes = _read_peak_bytes(name)
        peak_mb = peak_bytes / (1024 * 1024) if peak_bytes is not None else None
        return RunResult(profile.name, run_index, peak_mb, oom, status_code)
    except Exception as exc:  # noqa: BLE001 - surfaced in the summary, not swallowed
        oom = _was_oom_killed(name)
        return RunResult(profile.name, run_index, None, oom, None, error=str(exc))
    finally:
        _stop_and_remove(name)


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--profile", action="append", choices=["worst", "normal"], help="Repeatable; default both."
    )
    parser.add_argument(
        "--runs", type=int, default=3, help="Repeats per profile; the highest peak is kept."
    )
    parser.add_argument(
        "--output", type=Path, default=None, help="Write JSON results to this path."
    )
    args = parser.parse_args()

    if not _docker_available():
        print(
            "Docker is not available in this environment (daemon unreachable or "
            "the image/PyPI pulls it needs are blocked). Per task-plans/09b, do "
            "not invent a peak-memory number -- mark 09b blocked and re-run this "
            "script from a machine with real Docker network access.",
            file=sys.stderr,
        )
        raise SystemExit(2)

    settings = Settings(_env_file=None)  # type: ignore[call-arg]
    profiles = _build_profiles(settings)
    selected = args.profile or ["worst", "normal"]
    render_env = _load_render_env()
    render_env.setdefault("BACKEND_CORS_ORIGINS", "http://localhost:5173")
    stitch_timeout_s = settings.stitch_timeout_seconds + STITCH_TIMEOUT_BUFFER_SECONDS

    docker_version = subprocess.run(
        ["docker", "version", "--format", "{{.Server.Version}}"], capture_output=True, text=True
    ).stdout.strip()
    result = ScriptResult(docker_version=docker_version, python_image=IMAGE)

    worst_ok = True
    for profile_name in selected:
        profile = profiles[profile_name]
        print(
            f"== profile {profile_name}: {profile.frame_count} frames at "
            f"{profile.frame_width}x{profile.frame_height} =="
        )
        for run_index in range(1, args.runs + 1):
            run_result = _single_run(profile, render_env, run_index, stitch_timeout_s)
            result.runs.append(run_result)
            if run_result.error:
                print(f"  run {run_index}: ERROR {run_result.error}")
            else:
                print(
                    f"  run {run_index}: peak={run_result.peak_mb:.1f} MB "
                    f"oom={run_result.oom_killed} http={run_result.http_status}"
                )
            if run_result.oom_killed:
                worst_ok = worst_ok and profile_name != "worst"

    if args.output:
        args.output.write_text(json.dumps([vars(r) for r in result.runs], indent=2))
        print(f"results written to {args.output}")

    worst_peaks = [r.peak_mb for r in result.runs if r.profile == "worst" and r.peak_mb is not None]
    any_oom = any(r.oom_killed for r in result.runs)
    if any_oom:
        print("FAIL: at least one run was OOM-killed", file=sys.stderr)
        raise SystemExit(1)
    if worst_peaks and max(worst_peaks) > BUDGET_MB:
        print(
            f"FAIL: worst-profile peak {max(worst_peaks):.1f} MB exceeds the {BUDGET_MB} MB budget",
            file=sys.stderr,
        )
        raise SystemExit(1)
    print("all measured profiles are within budget")


if __name__ == "__main__":
    main()
