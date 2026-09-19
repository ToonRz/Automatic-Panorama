from __future__ import annotations

import sys
from pathlib import Path

import cv2
import httpx
import numpy as np

BACKEND_ROOT = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.tests.fixtures import end_to_end_fixture

REQUEST_TIMEOUT_SECONDS = 90.0


def _png_bytes(frame: np.ndarray) -> bytes:
    ok, encoded = cv2.imencode(".png", frame)
    if not ok:
        raise RuntimeError("Could not encode a smoke-test frame")
    return encoded.tobytes()


def check_health(client: httpx.Client) -> None:
    response = client.get("/healthz")
    if response.status_code != 200:
        raise SystemExit(f"/healthz: expected 200, got {response.status_code}: {response.text}")
    print(f"/healthz: {response.status_code} {response.json()}")


def check_config(client: httpx.Client) -> None:
    response = client.get("/api/v1/config")
    if response.status_code != 200:
        raise SystemExit(
            f"/api/v1/config: expected 200, got {response.status_code}: {response.text}"
        )
    print(f"/api/v1/config: {response.status_code} {response.json()}")


def check_stitch(client: httpx.Client) -> None:
    chain = end_to_end_fixture()
    files = [
        ("files", (f"frame-{index + 1}.png", _png_bytes(frame), "image/png"))
        for index, frame in enumerate(chain.frames)
    ]
    response = client.post("/api/v1/stitch", files=files)
    if response.status_code != 200:
        raise SystemExit(
            f"/api/v1/stitch: expected 200, got {response.status_code}: {response.text}"
        )
    diagnostics = response.json()["diagnostics"]
    print(f"/api/v1/stitch: {response.status_code}")
    print(
        "  detector={detector} images={image_count} order={order} "
        "inliers={inliers} inlier_ratio={ratio} reprojection_error_px={reproj} "
        "output={width}x{height}".format(
            detector=diagnostics["detector"],
            image_count=diagnostics["image_count"],
            order=diagnostics["image_order"],
            inliers=diagnostics["inliers_per_pair"],
            ratio=[round(value, 3) for value in diagnostics["inlier_ratio_per_pair"]],
            reproj=[round(value, 3) for value in diagnostics["reprojection_error_per_pair"]],
            width=diagnostics["output_width"],
            height=diagnostics["output_height"],
        )
    )
    print(f"  stage_timings_ms={diagnostics['stage_timings_ms']}")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(f"usage: python {Path(__file__).name} <api-base-url>")
    base_url = sys.argv[1].rstrip("/")
    with httpx.Client(base_url=base_url, timeout=REQUEST_TIMEOUT_SECONDS) as client:
        check_health(client)
        check_config(client)
        check_stitch(client)
    print("smoke check passed")


if __name__ == "__main__":
    main()
