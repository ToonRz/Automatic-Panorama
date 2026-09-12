"""Domain exceptions for the panorama pipeline, one factory per spec section 9 code.

Every failure the service can produce is a :class:`StitchPipelineError`
carrying a stable machine-readable ``code``, the HTTP status spec section 9
assigns it, a human message, and the ``context`` dict that table names. A
single FastAPI exception handler (wired in ``app.main``) turns any instance of
this type into the response envelope; callers never build the envelope by
hand, so a code raised in one place cannot drift from its documented shape.

Admission and gates 0-3 raise these from ``api/routes.py``; gates 4-9 raise
them from ``services/stitcher.py`` and ``app/cv/*``. Indices in ``context``
are zero-based; messages are one-based, because the interface counts frames
the way a person does (spec section 9).
"""

from __future__ import annotations

from typing import Any


class StitchPipelineError(Exception):
    """A gate rejection or pipeline failure with a stable, machine-readable code."""

    def __init__(
        self,
        code: str,
        http_status: int,
        message: str,
        context: dict[str, Any] | None = None,
    ) -> None:
        self.code = code
        self.http_status = http_status
        self.message = message
        self.context = context or {}
        super().__init__(message)


def service_busy(retry_after_seconds: int) -> StitchPipelineError:
    return StitchPipelineError(
        code="SERVICE_BUSY",
        http_status=503,
        message="The service is stitching another panorama. Try again shortly.",
        context={"retry_after_seconds": retry_after_seconds},
    )


def total_upload_too_large(total_mb: float, limit_mb: int) -> StitchPipelineError:
    return StitchPipelineError(
        code="TOTAL_UPLOAD_TOO_LARGE",
        http_status=413,
        message=f"The upload total exceeds the {limit_mb} MB request limit.",
        context={"total_mb": total_mb, "limit_mb": limit_mb},
    )


def too_few_images(received: int, required: int = 2) -> StitchPipelineError:
    return StitchPipelineError(
        code="TOO_FEW_IMAGES",
        http_status=400,
        message="Upload at least two overlapping images.",
        context={"received": received, "required": required},
    )


def too_many_images(received: int, limit: int) -> StitchPipelineError:
    return StitchPipelineError(
        code="TOO_MANY_IMAGES",
        http_status=400,
        message=f"Upload no more than {limit} images.",
        context={"received": received, "limit": limit},
    )


def unsupported_image_type(image_index: int, content_type: str | None) -> StitchPipelineError:
    return StitchPipelineError(
        code="UNSUPPORTED_IMAGE_TYPE",
        http_status=400,
        message=f"File {image_index + 1} is not a supported raster image.",
        context={"image": image_index, "content_type": content_type or ""},
    )


def empty_image(image_index: int) -> StitchPipelineError:
    return StitchPipelineError(
        code="EMPTY_IMAGE",
        http_status=422,
        message=f"File {image_index + 1} is empty.",
        context={"image": image_index},
    )


def image_too_large(image_index: int, size_mb: float, limit_mb: int) -> StitchPipelineError:
    return StitchPipelineError(
        code="IMAGE_TOO_LARGE",
        http_status=413,
        message=f"File {image_index + 1} exceeds the {limit_mb} MB limit.",
        context={"image": image_index, "size_mb": size_mb, "limit_mb": limit_mb},
    )


def invalid_stitch_settings(field: str, value: Any) -> StitchPipelineError:
    return StitchPipelineError(
        code="INVALID_STITCH_SETTINGS",
        http_status=422,
        message="Detector and geometric thresholds are invalid.",
        context={"field": field, "value": str(value)},
    )


def decode_failed(image_index: int) -> StitchPipelineError:
    return StitchPipelineError(
        code="DECODE_FAILED",
        http_status=422,
        message=f"File {image_index + 1} could not be read as an image.",
        context={"image": image_index},
    )


def image_too_many_pixels(image_index: int, pixels: int, limit: int) -> StitchPipelineError:
    return StitchPipelineError(
        code="IMAGE_TOO_MANY_PIXELS",
        http_status=422,
        message=f"File {image_index + 1} is above the {limit / 1_000_000:.0f} MP processing limit.",
        context={"image": image_index, "pixels": pixels, "limit": limit},
    )


def no_descriptors(image_index: int, keypoints: int, detector: str) -> StitchPipelineError:
    return StitchPipelineError(
        code="NO_DESCRIPTORS",
        http_status=422,
        message=f"Image {image_index + 1} has too little texture for this detector.",
        context={"image": image_index, "keypoints": keypoints, "detector": detector},
    )


def insufficient_matches(
    pair: tuple[int, int], pair_index: int, matches: int, required: int
) -> StitchPipelineError:
    a, b = pair
    return StitchPipelineError(
        code="INSUFFICIENT_MATCHES",
        http_status=422,
        message=f"Images {a + 1} and {b + 1} share too few descriptor matches.",
        context={
            "pair": list(pair),
            "pair_index": pair_index,
            "matches": matches,
            "required": required,
        },
    )


def insufficient_inliers(
    pair: tuple[int, int],
    pair_index: int,
    inliers: int,
    required: int,
    inlier_ratio: float,
) -> StitchPipelineError:
    a, b = pair
    return StitchPipelineError(
        code="INSUFFICIENT_INLIERS",
        http_status=422,
        message=f"Images {a + 1} and {b + 1} do not have enough geometric agreement.",
        context={
            "pair": list(pair),
            "pair_index": pair_index,
            "inliers": inliers,
            "required": required,
            "inlier_ratio": inlier_ratio,
        },
    )


def degenerate_homography(
    pair: tuple[int, int], pair_index: int, reason: str
) -> StitchPipelineError:
    a, b = pair
    return StitchPipelineError(
        code="DEGENERATE_HOMOGRAPHY",
        http_status=422,
        message=f"The transform between {a + 1} and {b + 1} collapses the image.",
        context={"pair": list(pair), "pair_index": pair_index, "reason": reason},
    )


def disconnected_images(image_index: int) -> StitchPipelineError:
    return StitchPipelineError(
        code="DISCONNECTED_IMAGES",
        http_status=422,
        message=f"Image {image_index + 1} shares no view with the others.",
        context={"image": image_index},
    )


def canvas_too_large(pixels: int, limit: int, width: int, height: int) -> StitchPipelineError:
    return StitchPipelineError(
        code="CANVAS_TOO_LARGE",
        http_status=422,
        message=f"The combined canvas exceeds the {limit / 1_000_000:.0f} MP output limit.",
        context={"pixels": pixels, "limit": limit, "width": width, "height": height},
    )


def stitch_timeout(elapsed_seconds: float, limit_seconds: int) -> StitchPipelineError:
    return StitchPipelineError(
        code="STITCH_TIMEOUT",
        http_status=504,
        message="Stitching took longer than the service allows.",
        context={"elapsed_seconds": elapsed_seconds, "limit_seconds": limit_seconds},
    )
