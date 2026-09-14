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
    pair: tuple[int, int], pair_index: int, matches: int, min_matches: int
) -> StitchPipelineError:
    a, b = pair
    return StitchPipelineError(
        code="INSUFFICIENT_MATCHES",
        http_status=422,
        message=(
            f"Images {a + 1} and {b + 1} share too few descriptor matches: "
            f"{matches} passed the ratio test, at least {min_matches} are required."
        ),
        context={
            "pair": list(pair),
            "pair_index": pair_index,
            "matches": matches,
            "min_matches": min_matches,
        },
    )


def insufficient_inliers(
    pair: tuple[int, int],
    pair_index: int,
    inlier_count: int,
    min_inliers: int,
    inlier_ratio: float,
    min_inlier_ratio: float,
    failed_checks: list[str],
) -> StitchPipelineError:
    """Gate 7's inlier-agreement check, spec section 3/7.3.

    ``failed_checks`` names every one of ``min_inliers``/``min_inlier_ratio``
    that this pair failed -- both are evaluated together (spec section 7.3),
    so a pair that clears neither must say so, not report only the first
    condition checked and hide the second.
    """

    a, b = pair
    reasons = []
    if "min_inliers" in failed_checks:
        reasons.append(f"only {inlier_count} inlier(s) (at least {min_inliers} required)")
    if "min_inlier_ratio" in failed_checks:
        reasons.append(
            f"an inlier ratio of {inlier_ratio:.2f} "
            f"(at least {min_inlier_ratio:.2f} required)"
        )
    message = (
        f"Images {a + 1} and {b + 1} do not have enough geometric agreement: "
        + " and ".join(reasons)
        + "."
    )
    return StitchPipelineError(
        code="INSUFFICIENT_INLIERS",
        http_status=422,
        message=message,
        context={
            "pair": list(pair),
            "pair_index": pair_index,
            "inlier_count": inlier_count,
            "min_inliers": min_inliers,
            "inlier_ratio": inlier_ratio,
            "min_inlier_ratio": min_inlier_ratio,
            "failed_checks": failed_checks,
        },
    )


def excessive_reprojection_error(
    pair: tuple[int, int],
    pair_index: int,
    reprojection_error: float,
    max_reprojection_error: float,
    inlier_count: int,
    inlier_ratio: float,
) -> StitchPipelineError:
    """Gate 7's fit-tightness check, distinct from :func:`insufficient_inliers`.

    A pair can clear the inlier count and ratio bars while still fitting
    loosely everywhere (spec section 12.3's non-overlapping fixture is a
    different failure from this one): that is a different, separately
    actionable measurement, so it gets its own code rather than reusing
    ``INSUFFICIENT_INLIERS`` for a condition that has nothing to do with how
    many inliers were found.
    """

    a, b = pair
    return StitchPipelineError(
        code="EXCESSIVE_REPROJECTION_ERROR",
        http_status=422,
        message=(
            f"Images {a + 1} and {b + 1} aligned with {inlier_count} inliers, but the fit is "
            f"loose: a median reprojection error of {reprojection_error:.2f}px exceeds the "
            f"{max_reprojection_error:.2f}px limit."
        ),
        context={
            "pair": list(pair),
            "pair_index": pair_index,
            "reprojection_error": reprojection_error,
            "max_reprojection_error": max_reprojection_error,
            "inlier_count": inlier_count,
            "inlier_ratio": inlier_ratio,
        },
    )


def degenerate_homography(
    pair: tuple[int, int],
    pair_index: int,
    reason: str,
    inlier_count: int | None = None,
    inlier_ratio: float | None = None,
) -> StitchPipelineError:
    """``inlier_count``/``inlier_ratio`` are attached only when they were actually

    computed before the degeneracy was detected (spec section 3 gate 7 runs
    the inlier check first): reporting a measurement that was never taken
    would overclaim what the pipeline observed.
    """

    a, b = pair
    context: dict[str, Any] = {"pair": list(pair), "pair_index": pair_index, "reason": reason}
    if inlier_count is not None:
        context["inlier_count"] = inlier_count
    if inlier_ratio is not None:
        context["inlier_ratio"] = inlier_ratio
    return StitchPipelineError(
        code="DEGENERATE_HOMOGRAPHY",
        http_status=422,
        message=f"The transform between {a + 1} and {b + 1} collapses the image ({reason}).",
        context=context,
    )


def disconnected_images(image_index: int, cause: StitchPipelineError) -> StitchPipelineError:
    """Gate 8: the far frame of a rejected pair cannot be linked into the chain.

    ``cause`` is the pair's own gate 6/7 rejection (spec section 3): its code,
    message, and measured context are preserved under ``context["cause"]``
    rather than discarded, so "shares no view with the others" is never
    reported as if it were an established fact when the real, measured
    finding was a matching or geometry failure for a specific pair
    (``cv/pipeline.py``'s documented interpretation of gate 8).
    """

    context: dict[str, Any] = {
        "image": image_index,
        "cause": {"code": cause.code, "message": cause.message, "context": cause.context},
    }
    if "partial_diagnostics" in cause.context:
        context["partial_diagnostics"] = cause.context["partial_diagnostics"]
    if "stopped_at_stage" in cause.context:
        context["stopped_at_stage"] = cause.context["stopped_at_stage"]
    return StitchPipelineError(
        code="DISCONNECTED_IMAGES",
        http_status=422,
        message=(
            f"Image {image_index + 1} could not be linked to the others: {cause.message}"
        ),
        context=context,
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
