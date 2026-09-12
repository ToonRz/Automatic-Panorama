"""Descriptor matching and Lowe ratio-test seam.

Gate 6 lives here: a pair whose ratio-passed match count falls below
``min_ratio_passed_matches`` raises ``INSUFFICIENT_MATCHES`` (spec section 3,
section 9).
"""

from collections.abc import Sequence
from dataclasses import dataclass

import cv2
import numpy as np

from app.core.errors import insufficient_matches
from app.cv.features import DetectorName


@dataclass(frozen=True)
class MatchResult:
    """Diagnostics for one candidate image pair that passed gate 6."""

    raw_pair_count: int
    ratio_passed: tuple[cv2.DMatch, ...]
    ratio_threshold: float
    norm_type: int
    overlap_score: float

    @property
    def ratio_passed_count(self) -> int:
        return len(self.ratio_passed)


def norm_type_for_detector(detector: DetectorName) -> int:
    """Select the descriptor distance metric from the detector alone.

    SIFT descriptors are float32 gradient histograms compared with Euclidean
    (L2) distance; ORB descriptors are binary strings compared with Hamming
    distance. Swapping this pairing silently degrades matching without
    raising, so it is isolated in its own function with its own test.
    """

    return cv2.NORM_L2 if detector == "SIFT" else cv2.NORM_HAMMING


def ratio_test(
    knn_matches: Sequence[Sequence[cv2.DMatch]],
    ratio_threshold: float,
) -> list[cv2.DMatch]:
    """Apply Lowe's ratio test to the two nearest neighbors.

    A KNN result with fewer than two neighbours is discarded rather than
    raised: it simply cannot be compared, not an error condition.
    """

    if not 0 < ratio_threshold < 1:
        raise ValueError("ratio_threshold must be between 0 and 1")
    return [
        pair[0]
        for pair in knn_matches
        if len(pair) >= 2 and pair[0].distance < ratio_threshold * pair[1].distance
    ]


def match_descriptors(
    source_descriptors: np.ndarray,
    destination_descriptors: np.ndarray,
    source_keypoint_count: int,
    destination_keypoint_count: int,
    detector: DetectorName,
    ratio_threshold: float,
    min_ratio_passed_matches: int,
    pair: tuple[int, int],
    pair_index: int,
) -> MatchResult:
    """Run detector-appropriate BF KNN matching, the ratio test, and gate 6.

    ``overlap_score`` is ratio-passed matches normalized by the smaller of
    the two images' keypoint counts; 07g uses it as the pairwise strength
    signal for reference-frame and ordering decisions.
    """

    norm_type = norm_type_for_detector(detector)
    matcher = cv2.BFMatcher(norm_type, crossCheck=False)
    knn_matches = matcher.knnMatch(source_descriptors, destination_descriptors, k=2)
    passed = ratio_test(knn_matches, ratio_threshold)

    if len(passed) < min_ratio_passed_matches:
        raise insufficient_matches(pair, pair_index, len(passed), min_ratio_passed_matches)

    smaller_keypoint_count = max(1, min(source_keypoint_count, destination_keypoint_count))
    overlap_score = len(passed) / smaller_keypoint_count

    return MatchResult(
        raw_pair_count=len(knn_matches),
        ratio_passed=tuple(passed),
        ratio_threshold=ratio_threshold,
        norm_type=norm_type,
        overlap_score=overlap_score,
    )
