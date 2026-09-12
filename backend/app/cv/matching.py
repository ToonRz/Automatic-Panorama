"""Descriptor matching and Lowe ratio-test seam."""

from collections.abc import Sequence
from dataclasses import dataclass

import cv2
import numpy as np

from app.cv.features import DetectorName


@dataclass(frozen=True)
class MatchResult:
    """Diagnostics for one candidate image pair."""

    raw_pair_count: int
    ratio_passed: tuple[cv2.DMatch, ...]
    ratio_threshold: float
    norm_type: int


def ratio_test(
    knn_matches: Sequence[Sequence[cv2.DMatch]],
    ratio_threshold: float,
) -> list[cv2.DMatch]:
    """Apply Lowe's ratio test to the two nearest neighbors."""

    if not 0 < ratio_threshold < 1:
        raise ValueError("ratio_threshold must be between 0 and 1")
    return [
        pair[0]
        for pair in knn_matches
        if len(pair) >= 2 and pair[0].distance < ratio_threshold * pair[1].distance
    ]


def match_descriptors(
    source: np.ndarray,
    destination: np.ndarray,
    detector: DetectorName,
    ratio_threshold: float = 0.75,
    cross_check: bool = False,
) -> MatchResult:
    """Run detector-appropriate BF KNN matching and the ratio test."""

    norm_type: int
    norm_type = cv2.NORM_L2 if detector == "SIFT" else cv2.NORM_HAMMING
    matcher = cv2.BFMatcher(norm_type, crossCheck=cross_check)
    knn_matches = matcher.knnMatch(source, destination, k=2)
    passed = ratio_test(knn_matches, ratio_threshold)
    return MatchResult(len(knn_matches), tuple(passed), ratio_threshold, norm_type)
