"""Liveness and configuration contract tests."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_healthz_returns_ok() -> None:
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["service"] == "automatic-panorama-api"


def test_client_config_exposes_safe_defaults() -> None:
    response = client.get("/api/v1/config")

    assert response.status_code == 200
    assert response.json()["default_detector"] == "SIFT"
    assert response.json()["max_upload_files"] == 8
