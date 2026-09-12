"""Admission, gates 0-3, settings, and concurrency (task 07b)."""

import threading
import time
from collections.abc import Callable

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app
from app.services.stitcher import StitchSlot

client = TestClient(app)


def _files(
    count: int, size: int = 32, content_type: str = "image/jpeg"
) -> list[tuple[str, tuple[str, bytes, str]]]:
    return [
        ("files", (f"frame{i}.jpg", bytes([i % 256]) * size, content_type)) for i in range(count)
    ]


def test_gate1_too_few_images() -> None:
    response = client.post("/api/v1/stitch", files=_files(1))

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["code"] == "TOO_FEW_IMAGES"
    assert detail["context"] == {"received": 1, "required": 2}


def test_gate1_too_many_images() -> None:
    response = client.post("/api/v1/stitch", files=_files(9))

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["code"] == "TOO_MANY_IMAGES"
    assert detail["context"] == {"received": 9, "limit": 8}


def test_gate2_unsupported_media_type() -> None:
    response = client.post(
        "/api/v1/stitch",
        files=[
            ("files", ("a.jpg", b"abc", "image/jpeg")),
            ("files", ("b.txt", b"abc", "text/plain")),
        ],
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["code"] == "UNSUPPORTED_IMAGE_TYPE"
    assert detail["context"] == {"image": 1, "content_type": "text/plain"}


def test_gate2_empty_image() -> None:
    response = client.post(
        "/api/v1/stitch",
        files=[
            ("files", ("a.jpg", b"abc", "image/jpeg")),
            ("files", ("b.jpg", b"", "image/jpeg")),
        ],
    )

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "EMPTY_IMAGE"
    assert detail["context"] == {"image": 1}


def test_gate2_image_too_large(settings_override: Callable[..., Settings]) -> None:
    settings_override(max_upload_mb=1)

    response = client.post(
        "/api/v1/stitch",
        files=[
            ("files", ("a.jpg", b"a" * (2 * 1024 * 1024), "image/jpeg")),
            ("files", ("b.jpg", b"b" * 10, "image/jpeg")),
        ],
    )

    assert response.status_code == 413
    detail = response.json()["detail"]
    assert detail["code"] == "IMAGE_TOO_LARGE"
    assert detail["context"]["image"] == 0
    assert detail["context"]["limit_mb"] == 1


def test_gate0_total_upload_too_large(settings_override: Callable[..., Settings]) -> None:
    settings_override(max_total_upload_mb=4)  # 4 is the setting's own minimum

    response = client.post(
        "/api/v1/stitch",
        files=[
            ("files", ("a.jpg", b"a" * (3 * 1024 * 1024), "image/jpeg")),
            ("files", ("b.jpg", b"b" * (3 * 1024 * 1024), "image/jpeg")),
        ],
    )

    assert response.status_code == 413
    detail = response.json()["detail"]
    assert detail["code"] == "TOTAL_UPLOAD_TOO_LARGE"
    assert detail["context"]["limit_mb"] == 4


def test_gate3_invalid_detector() -> None:
    response = client.post(
        "/api/v1/stitch",
        files=_files(2),
        data={"detector": "SURF"},
    )

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "INVALID_STITCH_SETTINGS"
    assert detail["context"]["field"] == "detector"


def test_gate3_invalid_ratio_threshold() -> None:
    response = client.post(
        "/api/v1/stitch",
        files=_files(2),
        data={"ratio_threshold": "1.5"},
    )

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "INVALID_STITCH_SETTINGS"
    assert detail["context"]["field"] == "ratio_threshold"


def test_service_busy_when_the_single_stitch_slot_is_held() -> None:
    settings = Settings(_env_file=None)
    slot = StitchSlot(settings)
    slot.__enter__()
    try:
        response = client.post("/api/v1/stitch", files=_files(2))
    finally:
        slot.__exit__(None, None, None)

    assert response.status_code == 503
    detail = response.json()["detail"]
    assert detail["code"] == "SERVICE_BUSY"
    assert "retry_after_seconds" in detail["context"]


def test_healthz_answers_quickly_while_a_slow_stitch_occupies_the_worker(monkeypatch) -> None:
    def slow_stitch(*args: object, **kwargs: object) -> None:
        time.sleep(1.0)
        raise RuntimeError("should not be reached by the health check")

    monkeypatch.setattr("app.api.routes.stitch", slow_stitch)

    # TestClient re-raises an unhandled server exception by default (so bugs
    # surface during testing); this test deliberately triggers one on a
    # background thread and only cares about /healthz staying responsive, so
    # that behaviour is turned off just for this call.
    background_client = TestClient(app, raise_server_exceptions=False)

    def _fire_slow_request() -> None:
        background_client.post("/api/v1/stitch", files=_files(2))

    thread = threading.Thread(target=_fire_slow_request)
    thread.start()
    time.sleep(0.15)  # let the slow request actually enter the threadpool

    start = time.perf_counter()
    response = client.get("/healthz")
    elapsed = time.perf_counter() - start

    thread.join(timeout=5)

    assert response.status_code == 200
    assert elapsed < 0.2
