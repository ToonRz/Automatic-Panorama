"""Orchestration for the panorama pipeline: gate 4 plus the full success path.

Decode, downscale, stage ordering, diagnostics aggregation, and timing live
here (spec section 2's layer contract); this module never knows about HTTP,
status codes, or multipart -- `api/routes.py` translates its
:class:`StitchPipelineError` exceptions into the response envelope.
"""

import math
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass

import cv2
import numpy as np

from app.core.config import Settings
from app.core.errors import (
    StitchPipelineError,
    decode_failed,
    image_too_many_pixels,
    service_busy,
    stitch_timeout,
)
from app.cv.blending import (
    blend_with_exposure_compensation,
    crop_to_valid_region,
    encode_png,
    sample_correspondences_for_pair,
)
from app.cv.features import FeatureSet, extract_features
from app.cv.pipeline import ChainResult, build_chain, pair_diagnostics_from_chain
from app.cv.warping import warp_to_common_canvas
from app.schemas.stitch import StitchSettings

# Section 5.2's budget model: a fixed input size cannot work because the
# canvas grows with image count, so the long-edge budget is derived per
# request from the output ceiling. These three constants are the spec's own
# illustrative model, not tunable policy, so they are not settings.
_OVERLAP_ADVANCE = 0.70
_BOW_ALLOWANCE = 1.15
_NOMINAL_ASPECT = 4 / 3

_RETRY_AFTER_SECONDS = 2


def input_long_edge_budget(image_count: int, settings: Settings) -> int:
    """The per-request downscale budget so an eight-frame canvas still fits (spec 5.2)."""

    modelled = math.sqrt(
        settings.max_output_pixels
        * settings.canvas_budget_fraction
        * _NOMINAL_ASPECT
        / (_BOW_ALLOWANCE * (_OVERLAP_ADVANCE * image_count + (1 - _OVERLAP_ADVANCE)))
    )
    return int(
        min(settings.input_long_edge_cap, max(settings.input_long_edge_floor, modelled))
    )


@dataclass(frozen=True)
class DecodedImage:
    """One image after gate 4: decoded, pixel-checked, and budget-resized."""

    array: np.ndarray
    source_dimensions: tuple[int, int]
    processed_dimensions: tuple[int, int]
    scale_factor: float


def decode_and_downscale(
    file_payloads: list[bytes],
    settings: Settings,
) -> tuple[list[DecodedImage], int]:
    """Gate 4: decode in memory, enforce the pixel ceiling, then resize to budget.

    Resizing only ever shrinks: an image already inside the budget keeps a
    scale factor of exactly 1.0 rather than an incidental float near it.
    """

    image_count = len(file_payloads)
    budget = input_long_edge_budget(image_count, settings)

    decoded: list[DecodedImage] = []
    for index, payload in enumerate(file_payloads):
        array = cv2.imdecode(np.frombuffer(payload, dtype=np.uint8), cv2.IMREAD_COLOR)
        if array is None:
            raise decode_failed(index)

        height, width = array.shape[:2]
        pixels = width * height
        if pixels > settings.max_image_pixels:
            raise image_too_many_pixels(index, pixels, settings.max_image_pixels)

        long_edge = max(width, height)
        if long_edge > budget:
            scale = budget / long_edge
            new_width = max(1, round(width * scale))
            new_height = max(1, round(height * scale))
            resized = cv2.resize(array, (new_width, new_height), interpolation=cv2.INTER_AREA)
            scale_factor = max(new_width, new_height) / long_edge
        else:
            resized = array
            new_width, new_height = width, height
            scale_factor = 1.0

        decoded.append(
            DecodedImage(
                array=resized,
                source_dimensions=(width, height),
                processed_dimensions=(new_width, new_height),
                scale_factor=scale_factor,
            )
        )

    return decoded, budget


# A semaphore bounding concurrent stitches to `max_concurrent_stitches` is
# process-lifetime admission control, not request data -- rule 03 ("nothing
# survives the request") is about uploaded bytes and intermediate arrays,
# which this never holds. It is created once, lazily, since settings are
# themselves cached for the process lifetime.
_stitch_semaphore: threading.Semaphore | None = None
_stitch_semaphore_lock = threading.Lock()


def _semaphore(settings: Settings) -> threading.Semaphore:
    global _stitch_semaphore
    if _stitch_semaphore is None:
        with _stitch_semaphore_lock:
            if _stitch_semaphore is None:
                _stitch_semaphore = threading.Semaphore(settings.max_concurrent_stitches)
    return _stitch_semaphore


class StitchSlot:
    """Admission guard: at most `max_concurrent_stitches` requests process at once.

    A request that finds the slot full exits immediately with `SERVICE_BUSY`
    rather than queueing (spec section 4): in a lecture hall a fast "the
    service is busy" beats a slow answer to the same question.
    """

    def __init__(self, settings: Settings) -> None:
        self._semaphore = _semaphore(settings)
        self._acquired = False

    def __enter__(self) -> "StitchSlot":
        self._acquired = self._semaphore.acquire(blocking=False)
        if not self._acquired:
            raise service_busy(_RETRY_AFTER_SECONDS)
        return self

    def __exit__(self, *exc_info: object) -> None:
        if self._acquired:
            self._semaphore.release()


class _StageTimer:
    """Records one entry in `stage_timings_ms` for the wrapped block."""

    def __init__(self, sink: dict[str, float], name: str) -> None:
        self._sink = sink
        self._name = name
        self._start = 0.0

    def __enter__(self) -> "_StageTimer":
        self._start = time.perf_counter()
        return self

    def __exit__(self, *exc_info: object) -> None:
        self._sink[self._name] = (time.perf_counter() - self._start) * 1000.0


@dataclass(frozen=True)
class StitchOutcome:
    """Everything `api/routes.py` needs to assemble the section 7 response."""

    png_bytes: bytes
    width: int
    height: int
    diagnostics: dict[str, object]


def stitch(
    file_payloads: list[bytes],
    options: StitchSettings,
    settings: Settings,
    clock: Callable[[], float] = time.perf_counter,
) -> StitchOutcome:
    """Run gates 4 through 9 and assemble the full diagnostics payload.

    The whole of gates 4-9 runs under one deadline (spec section 4): the
    worker thread cannot be cancelled once started, so a request that runs
    past `stitch_timeout_seconds` still finishes the work and then reports
    `STITCH_TIMEOUT` instead of a success -- the timeout protects the
    client's patience, not the server's CPU. ``clock`` is injectable so a
    test can simulate an over-budget request without actually waiting
    `stitch_timeout_seconds` (minimum 10s) of wall-clock time.
    """

    request_start = clock()
    stage_timings_ms: dict[str, float] = {}

    with _StageTimer(stage_timings_ms, "decode"):
        decoded, budget = decode_and_downscale(file_payloads, settings)

    image_count = len(decoded)
    images = [item.array for item in decoded]
    image_sizes = [(item.array.shape[1], item.array.shape[0]) for item in decoded]

    with _StageTimer(stage_timings_ms, "features"):
        features = [
            extract_features(
                image, options.detector, settings.detector_nfeatures, image_index=index
            )
            for index, image in enumerate(images)
        ]

    chain = build_chain(
        features,
        image_sizes,
        options.detector,
        ratio_threshold=options.ratio_threshold,
        min_ratio_passed_matches=settings.min_ratio_passed_matches,
        ransac_reproj_threshold=options.ransac_reproj_threshold,
        min_inliers=settings.min_inliers,
        min_inlier_ratio=settings.min_inlier_ratio,
        max_reprojection_error=settings.max_reprojection_error,
        stage_timings_ms=stage_timings_ms,
    )

    with _StageTimer(stage_timings_ms, "warp"):
        try:
            warp_result = warp_to_common_canvas(
                images, list(chain.transforms_to_reference), settings.max_output_pixels
            )
        except StitchPipelineError as exc:
            # Every pair already cleared gates 6 and 7 by this point (the
            # chain above would have raised otherwise), so this rejection is
            # about the composed canvas, not any one pair's geometry -- the
            # per-pair evidence is still worth attaching alongside that.
            exc.context["partial_diagnostics"] = pair_diagnostics_from_chain(chain)
            exc.context["stopped_at_stage"] = "warp"
            raise

    with _StageTimer(stage_timings_ms, "blend"):
        blended = blend_with_exposure_compensation(
            warp_result.warped_images, warp_result.valid_masks
        )
        cropped, crop_offset = crop_to_valid_region(blended, warp_result.valid_masks)

    with _StageTimer(stage_timings_ms, "encode"):
        png_bytes = encode_png(cropped)

    seam_lines = [
        {
            "top": [seam["top"][0] - crop_offset[0], seam["top"][1] - crop_offset[1]],
            "bottom": [seam["bottom"][0] - crop_offset[0], seam["bottom"][1] - crop_offset[1]],
        }
        for seam in warp_result.seam_lines
    ]
    sample_correspondences_per_pair = _sample_correspondences(
        chain, features, warp_result.translation, crop_offset
    )

    diagnostics: dict[str, object] = {
        "detector": options.detector,
        "image_count": image_count,
        "image_order": chain.image_order,
        "reference_index": chain.reference_index,
        "input_long_edge_budget": budget,
        "source_dimensions": [list(item.source_dimensions) for item in decoded],
        "processed_dimensions": [list(item.processed_dimensions) for item in decoded],
        "input_scale_factor": [item.scale_factor for item in decoded],
        "keypoints_per_image": [feature_set.keypoint_count for feature_set in features],
        "candidate_pair_count": len(chain.match_results),
        "ratio_passed_matches_per_pair": [m.ratio_passed_count for m in chain.match_results],
        "inliers_per_pair": [h.inlier_count for h in chain.homography_results],
        "inlier_ratio_per_pair": [h.inlier_ratio for h in chain.homography_results],
        "reprojection_error_per_pair": [h.reprojection_error for h in chain.homography_results],
        "output_width": cropped.shape[1],
        "output_height": cropped.shape[0],
        "stage_timings_ms": stage_timings_ms,
        "seam_lines": seam_lines,
        "sample_correspondences_per_pair": sample_correspondences_per_pair,
    }

    elapsed_seconds = clock() - request_start
    if elapsed_seconds > settings.stitch_timeout_seconds:
        # The pipeline itself ran to completion (every stage above returned);
        # only the wall-clock budget was missed. The evidence gathered along
        # the way is still real and worth keeping rather than discarding.
        error = stitch_timeout(elapsed_seconds, settings.stitch_timeout_seconds)
        error.context["partial_diagnostics"] = pair_diagnostics_from_chain(chain)
        error.context["stopped_at_stage"] = "timeout"
        raise error

    return StitchOutcome(
        png_bytes=png_bytes,
        width=cropped.shape[1],
        height=cropped.shape[0],
        diagnostics=diagnostics,
    )


def _sample_correspondences(
    chain: ChainResult,
    features: list[FeatureSet],
    translation: np.ndarray,
    crop_offset: tuple[int, int],
) -> list[list[dict[str, list[float]]]]:
    """Project each pair's inlier correspondences onto the final cropped canvas."""

    per_pair: list[list[dict[str, list[float]]]] = []
    for pair_index in range(len(chain.homography_results)):
        left = chain.image_order[pair_index]
        right = chain.image_order[pair_index + 1]
        match_result = chain.match_results[pair_index]
        homography_result = chain.homography_results[pair_index]

        source_points = np.array(
            [features[left].keypoints[m.queryIdx].pt for m in match_result.ratio_passed],
            dtype=np.float32,
        )
        destination_points = np.array(
            [features[right].keypoints[m.trainIdx].pt for m in match_result.ratio_passed],
            dtype=np.float32,
        )
        inlier_mask = homography_result.inlier_mask
        transform_left = translation @ chain.transforms_to_reference[left]
        transform_right = translation @ chain.transforms_to_reference[right]

        per_pair.append(
            sample_correspondences_for_pair(
                source_points[inlier_mask],
                destination_points[inlier_mask],
                transform_left,
                transform_right,
                crop_offset,
            )
        )
    return per_pair
