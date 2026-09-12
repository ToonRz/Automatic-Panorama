"""Shared pytest fixtures and the numeric acceptance thresholds from spec 12.3.

Every threshold a test in this suite asserts against is named here. No test
in this package should hard-code one of these numbers; retuning a bar is a
reviewed change to `docs/backend-spec.md` section 12.3, not a quiet edit deep
in a test file.
"""

from __future__ import annotations

from collections.abc import Callable

import cv2
import numpy as np
import pytest

from app.core.config import Settings, get_settings

# --- spec section 12.3: numbers a slice must hit to merge -------------------

SIFT_MIN_INLIER_RATIO = 0.60
SIFT_MAX_REPROJECTION_ERROR_PX = 2.0
SIFT_MAX_CORNER_ERROR_PX = 3.0

ORB_MIN_INLIER_RATIO = 0.45
ORB_MAX_CORNER_ERROR_PX = 5.0

THREE_FRAME_CANVAS_TOLERANCE = 0.05
MAX_BLACK_BORDER_PX = 2


@pytest.fixture()
def settings() -> Settings:
    """Default settings, isolated from whatever the host shell has exported."""

    return Settings(_env_file=None)  # type: ignore[call-arg]


@pytest.fixture()
def settings_override(monkeypatch: pytest.MonkeyPatch) -> Callable[..., Settings]:
    """Temporarily override the process-wide cached settings for a live-app test.

    `get_settings()` is cached for the process lifetime, but `app.main`'s
    gate-0 middleware and `Depends(get_settings)` both call it fresh per
    request -- so setting the environment variable and clearing the cache is
    enough to make a live `TestClient` request see the override.
    """

    def _apply(**overrides: object) -> Settings:
        for key, value in overrides.items():
            monkeypatch.setenv(key.upper(), str(value))
        get_settings.cache_clear()
        return get_settings()

    yield _apply
    get_settings.cache_clear()


def corner_error_px(
    image_shape: tuple[int, ...], ground_truth: np.ndarray, estimate: np.ndarray
) -> np.ndarray:
    """Distance in pixels between the four corners projected by two homographies."""

    height, width = image_shape[0], image_shape[1]
    corners = np.float32([[0, 0], [width, 0], [width, height], [0, height]]).reshape(-1, 1, 2)
    expected = cv2.perspectiveTransform(corners, ground_truth)
    actual = cv2.perspectiveTransform(corners, estimate)
    return np.linalg.norm((expected - actual).reshape(-1, 2), axis=1)
