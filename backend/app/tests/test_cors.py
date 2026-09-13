"""CORS behaviour: exact origins plus the optional Preview-origin regex.

`CORSMiddleware` reads settings once, when `create_app()` builds it, so each
test builds a fresh app from its own environment rather than reusing the
module-level `app.main.app` singleton.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app

PREVIEW_REGEX = r"^https://automatic-panorama-[a-z0-9-]+-toonrzs-projects\.vercel\.app$"


def _build_app(monkeypatch: pytest.MonkeyPatch, **env: str) -> FastAPI:
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    get_settings.cache_clear()
    return create_app()


@pytest.fixture(autouse=True)
def _clear_settings_cache() -> Iterator[None]:
    yield
    get_settings.cache_clear()


def test_unset_regex_keeps_exact_origin_behaviour_unchanged(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    application = _build_app(
        monkeypatch,
        BACKEND_CORS_ORIGINS="http://localhost:5173",
        BACKEND_CORS_ORIGIN_REGEX="",
    )
    client = TestClient(application)

    allowed = client.get("/healthz", headers={"Origin": "http://localhost:5173"})
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:5173"

    other = client.get("/healthz", headers={"Origin": "https://example.vercel.app"})
    assert "access-control-allow-origin" not in other.headers


def test_regex_allows_a_matching_preview_origin(monkeypatch: pytest.MonkeyPatch) -> None:
    application = _build_app(
        monkeypatch,
        BACKEND_CORS_ORIGINS="http://localhost:5173",
        BACKEND_CORS_ORIGIN_REGEX=PREVIEW_REGEX,
    )
    client = TestClient(application)
    preview_origin = "https://automatic-panorama-git-test-toonrzs-projects.vercel.app"

    preflight = client.options(
        "/healthz",
        headers={
            "Origin": preview_origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert preflight.headers.get("access-control-allow-origin") == preview_origin

    simple = client.get("/healthz", headers={"Origin": preview_origin})
    assert simple.headers.get("access-control-allow-origin") == preview_origin


@pytest.mark.parametrize(
    "origin",
    [
        "https://automatic-panorama-toonrzs-projects.vercel.app.evil.com",
        "https://other-git-test-toonrzs-projects.vercel.app",
        "http://automatic-panorama-git-test-toonrzs-projects.vercel.app",
    ],
)
def test_regex_rejects_lookalike_and_wrong_scheme_origins(
    monkeypatch: pytest.MonkeyPatch, origin: str
) -> None:
    application = _build_app(
        monkeypatch,
        BACKEND_CORS_ORIGINS="http://localhost:5173",
        BACKEND_CORS_ORIGIN_REGEX=PREVIEW_REGEX,
    )
    client = TestClient(application)

    response = client.get("/healthz", headers={"Origin": origin})
    assert "access-control-allow-origin" not in response.headers


def test_invalid_regex_fails_at_startup_naming_the_setting(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("BACKEND_CORS_ORIGIN_REGEX", "(unclosed[")
    get_settings.cache_clear()

    with pytest.raises(ValueError, match="BACKEND_CORS_ORIGIN_REGEX"):
        Settings()
