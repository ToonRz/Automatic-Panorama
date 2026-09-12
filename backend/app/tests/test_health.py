"""Liveness and configuration contract tests."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_healthz_returns_ok() -> None:
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["service"] == "automatic-panorama-api"


def test_client_config_exposes_exactly_the_nine_spec_fields() -> None:
    response = client.get("/api/v1/config")

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {
        "max_upload_files",
        "max_upload_mb",
        "max_total_upload_mb",
        "default_detector",
        "ratio_threshold",
        "ransac_reproj_threshold",
        "min_inliers",
        "min_inlier_ratio",
        "max_input_long_edge_by_count",
    }
    assert body["default_detector"] == "SIFT"
    assert body["max_upload_files"] == 8
    assert body["max_input_long_edge_by_count"] == {
        "2": 1600,
        "3": 1600,
        "4": 1498,
        "5": 1353,
        "6": 1243,
        "7": 1156,
        "8": 1085,
    }
