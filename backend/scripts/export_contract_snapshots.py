"""Export deterministic-shape frontend fixtures from the real FastAPI app."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.main import create_app
from app.tests.fixtures import end_to_end_fixture, non_overlapping_pair

PLACEHOLDER_PNG_DATA_URL = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)
SNAPSHOT_DIR = Path(__file__).parents[2] / "frontend" / "src" / "fixtures" / "contract"


def _png(frame: np.ndarray) -> bytes:
    ok, encoded = cv2.imencode(".png", frame)
    if not ok:
        raise RuntimeError("Could not encode contract fixture")
    return encoded.tobytes()


def _normalize(value: Any, key: str | None = None) -> Any:
    if key == "data_url":
        return PLACEHOLDER_PNG_DATA_URL
    if isinstance(value, dict):
        return {item_key: _normalize(item, item_key) for item_key, item in value.items()}
    if isinstance(value, list):
        return [_normalize(item) for item in value]
    if isinstance(value, float):
        return round(value, 3)
    return value


def generate_contract_snapshots() -> dict[str, object]:
    client = TestClient(create_app(), raise_server_exceptions=False)
    chain = end_to_end_fixture()
    success_files = [
        ("files", (f"frame-{index + 1}.png", _png(frame), "image/png"))
        for index, frame in enumerate(chain.frames)
    ]
    non_overlap = non_overlapping_pair()
    non_overlap_files = [
        ("files", ("frame-1.png", _png(non_overlap.frame_a), "image/png")),
        ("files", ("frame-2.png", _png(non_overlap.frame_b), "image/png")),
    ]
    responses = {
        "config.json": client.get("/api/v1/config"),
        "stitch-success.json": client.post("/api/v1/stitch", files=success_files),
        "error-too-few-images.json": client.post(
            "/api/v1/stitch", files=[("files", ("frame-1.png", _png(chain.frames[0]), "image/png"))]
        ),
        "error-insufficient-inliers.json": client.post(
            "/api/v1/stitch", files=non_overlap_files
        ),
    }
    expected_statuses = {
        "config.json": 200,
        "stitch-success.json": 200,
        "error-too-few-images.json": 400,
        "error-insufficient-inliers.json": 422,
    }
    snapshots: dict[str, object] = {}
    for name, response in responses.items():
        if response.status_code != expected_statuses[name]:
            raise RuntimeError(f"{name}: expected {expected_statuses[name]}, got {response.status_code}: {response.text}")
        snapshots[name] = _normalize(response.json())
    error = snapshots["error-insufficient-inliers.json"]
    if not isinstance(error, dict) or error.get("detail", {}).get("code") != "INSUFFICIENT_INLIERS":  # type: ignore[union-attr]
        raise RuntimeError(f"error-insufficient-inliers.json: unexpected response {error}")
    return snapshots


def write_contract_snapshots(directory: Path = SNAPSHOT_DIR) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    for name, payload in generate_contract_snapshots().items():
        (directory / name).write_text(
            json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=SNAPSHOT_DIR)
    args = parser.parse_args()
    write_contract_snapshots(args.output)


if __name__ == "__main__":
    main()
