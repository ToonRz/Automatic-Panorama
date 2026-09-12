"""Tests for the scaffold upload contract and honest placeholder response."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_stitch_requires_at_least_two_images() -> None:
    response = client.post(
        "/api/v1/stitch",
        files={"files": ("one.jpg", b"placeholder", "image/jpeg")},
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "TOO_FEW_IMAGES"


def test_stitch_returns_explicit_placeholder_status() -> None:
    response = client.post(
        "/api/v1/stitch",
        files=[
            ("files", ("left.jpg", b"placeholder-left", "image/jpeg")),
            ("files", ("right.jpg", b"placeholder-right", "image/jpeg")),
        ],
        data={"detector": "SIFT", "ratio_threshold": "0.75"},
    )

    assert response.status_code == 501
    assert response.json()["detail"]["code"] == "PIPELINE_NOT_IMPLEMENTED"
