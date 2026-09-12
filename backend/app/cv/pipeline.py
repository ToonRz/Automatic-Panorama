"""Top-level multi-image pipeline boundary.

Owns ``image_order``, ``reference_index``, and composing every pairwise
homography into one coordinate system (spec section 7.2, gate 8's "every
image reachable" check). No stage math lives here: it calls
``cv/matching.py`` and ``cv/homography.py`` for each adjacent pair in the
chain and composes their results.

v1 chains frames in upload order and anchors on the middle frame
(``docs/cv-pipeline.md`` section 5). A 2-image request has only one pair, so
a rejection there is reported as that pair's own gate 6/7 code -- there is no
second frame to call "disconnected" from. From three images on, a pair that
fails gate 6 or gate 7 means the far frame in that pair cannot be linked into
the chain at all, so it is re-reported as ``DISCONNECTED_IMAGES`` naming that
frame; this is a documented interpretation of spec section 3 gate 8; see the
project report for why.
"""

import time
from dataclasses import dataclass

import numpy as np

from app.core.errors import StitchPipelineError, disconnected_images
from app.cv.features import DetectorName, FeatureSet
from app.cv.homography import HomographyResult, estimate_homography
from app.cv.matching import MatchResult, match_descriptors


@dataclass(frozen=True)
class ChainResult:
    """Everything downstream stages (warping, blending) need to compose the canvas."""

    image_order: list[int]
    reference_index: int
    match_results: tuple[MatchResult, ...]
    homography_results: tuple[HomographyResult, ...]
    transforms_to_reference: tuple[np.ndarray, ...]


def reference_index_for(image_count: int) -> int:
    """The middle frame in upload order (spec section 7.2)."""

    return image_count // 2


def _compose_transforms(
    homography_results: tuple[HomographyResult, ...],
    reference_index: int,
) -> tuple[np.ndarray, ...]:
    """Compose every adjacent H into one mapping onto the reference frame.

    ``homography_results[i].matrix`` maps image ``i`` -> image ``i + 1``.
    Walking outward from the reference multiplies in the direction that
    keeps every transform pointing at reference-frame coordinates.
    """

    image_count = len(homography_results) + 1
    transforms: list[np.ndarray] = [np.eye(3, dtype=np.float64)] * image_count
    transforms[reference_index] = np.eye(3, dtype=np.float64)

    for i in range(reference_index, image_count - 1):
        transforms[i + 1] = transforms[i] @ np.linalg.inv(homography_results[i].matrix)

    for i in range(reference_index - 1, -1, -1):
        transforms[i] = transforms[i + 1] @ homography_results[i].matrix

    return tuple(transforms)


def build_chain(
    features: list[FeatureSet],
    image_sizes: list[tuple[int, int]],
    detector: DetectorName,
    ratio_threshold: float,
    min_ratio_passed_matches: int,
    ransac_reproj_threshold: float,
    min_inliers: int,
    min_inlier_ratio: float,
    max_reprojection_error: float,
    stage_timings_ms: dict[str, float] | None = None,
) -> ChainResult:
    """Build the upload-order chain: match, verify, and compose every pair.

    ``stage_timings_ms``, when given, accumulates ``"matching"`` and
    ``"homography"`` wall-clock totals across every pair processed here, so
    the orchestrator (``services/stitcher.py``) can report the same seven
    stage keys spec section 7 defines without re-timing this loop itself.
    """

    timings = {} if stage_timings_ms is None else stage_timings_ms
    timings.setdefault("matching", 0.0)
    timings.setdefault("homography", 0.0)

    image_count = len(features)
    image_order = list(range(image_count))
    reference_index = reference_index_for(image_count)

    match_results: list[MatchResult] = []
    homography_results: list[HomographyResult] = []

    for pair_index in range(image_count - 1):
        left, right = image_order[pair_index], image_order[pair_index + 1]
        # extract_features() raises NO_DESCRIPTORS before ever returning a
        # FeatureSet with no descriptors, so every FeatureSet reaching here
        # is guaranteed to carry a real array.
        left_descriptors = features[left].descriptors
        right_descriptors = features[right].descriptors
        assert left_descriptors is not None
        assert right_descriptors is not None
        try:
            match_start = time.perf_counter()
            match_result = match_descriptors(
                left_descriptors,
                right_descriptors,
                features[left].keypoint_count,
                features[right].keypoint_count,
                detector,
                ratio_threshold=ratio_threshold,
                min_ratio_passed_matches=min_ratio_passed_matches,
                pair=(left, right),
                pair_index=pair_index,
            )
            timings["matching"] += (time.perf_counter() - match_start) * 1000.0

            source_points = np.array(
                [features[left].keypoints[m.queryIdx].pt for m in match_result.ratio_passed],
                dtype=np.float32,
            )
            destination_points = np.array(
                [features[right].keypoints[m.trainIdx].pt for m in match_result.ratio_passed],
                dtype=np.float32,
            )
            homography_start = time.perf_counter()
            homography_result = estimate_homography(
                source_points,
                destination_points,
                image_size=image_sizes[left],
                ransac_reproj_threshold=ransac_reproj_threshold,
                min_inliers=min_inliers,
                min_inlier_ratio=min_inlier_ratio,
                max_reprojection_error=max_reprojection_error,
                pair=(left, right),
                pair_index=pair_index,
            )
            timings["homography"] += (time.perf_counter() - homography_start) * 1000.0
        except StitchPipelineError:
            if image_count == 2:
                raise
            raise disconnected_images(right) from None

        match_results.append(match_result)
        homography_results.append(homography_result)

    transforms = _compose_transforms(tuple(homography_results), reference_index)
    return ChainResult(
        image_order=image_order,
        reference_index=reference_index,
        match_results=tuple(match_results),
        homography_results=tuple(homography_results),
        transforms_to_reference=transforms,
    )
