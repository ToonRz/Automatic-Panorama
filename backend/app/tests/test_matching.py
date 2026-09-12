"""Gate 6: descriptor matching and the ratio test (task 07e)."""

import cv2
import pytest

from app.core.errors import StitchPipelineError
from app.cv.features import extract_features
from app.cv.matching import match_descriptors, norm_type_for_detector, ratio_test
from app.tests.fixtures import overlapping_pair, repeated_texture_pair


def test_ratio_test_keeps_only_distinct_nearest_matches() -> None:
    accepted = cv2.DMatch(_queryIdx=0, _trainIdx=0, _imgIdx=0, _distance=1.0)
    runner_up = cv2.DMatch(_queryIdx=0, _trainIdx=1, _imgIdx=0, _distance=2.0)
    ambiguous = cv2.DMatch(_queryIdx=1, _trainIdx=0, _imgIdx=0, _distance=1.9)
    ambiguous_runner_up = cv2.DMatch(_queryIdx=1, _trainIdx=1, _imgIdx=0, _distance=2.0)

    matches = ratio_test([[accepted, runner_up], [ambiguous, ambiguous_runner_up]], 0.75)

    assert matches == [accepted]


def test_ratio_test_discards_single_neighbour_results_without_raising() -> None:
    lone = [cv2.DMatch(_queryIdx=0, _trainIdx=0, _imgIdx=0, _distance=1.0)]

    matches = ratio_test([lone], 0.75)

    assert matches == []


def test_norm_type_selects_l2_for_sift_and_hamming_for_orb() -> None:
    assert norm_type_for_detector("SIFT") == cv2.NORM_L2
    assert norm_type_for_detector("ORB") == cv2.NORM_HAMMING
    assert norm_type_for_detector("SIFT") != norm_type_for_detector("ORB")


def test_ordinary_pair_clears_the_ratio_passed_floor() -> None:
    pair = overlapping_pair(seed=1)
    features_a = extract_features(pair.frame_a, "SIFT", nfeatures=2000)
    features_b = extract_features(pair.frame_b, "SIFT", nfeatures=2000)

    result = match_descriptors(
        features_a.descriptors,
        features_b.descriptors,
        features_a.keypoint_count,
        features_b.keypoint_count,
        "SIFT",
        ratio_threshold=0.75,
        min_ratio_passed_matches=20,
        pair=(0, 1),
        pair_index=0,
    )

    assert result.ratio_passed_count >= 20
    assert 0 < result.overlap_score <= 1


def test_repeated_texture_pair_yields_fewer_ratio_passed_matches_than_ordinary_pair() -> None:
    ordinary = overlapping_pair(seed=1)
    repeated = repeated_texture_pair(seed=1)

    ordinary_a = extract_features(ordinary.frame_a, "SIFT", nfeatures=2000)
    ordinary_b = extract_features(ordinary.frame_b, "SIFT", nfeatures=2000)
    ordinary_result = match_descriptors(
        ordinary_a.descriptors,
        ordinary_b.descriptors,
        ordinary_a.keypoint_count,
        ordinary_b.keypoint_count,
        "SIFT",
        ratio_threshold=0.75,
        min_ratio_passed_matches=1,
        pair=(0, 1),
        pair_index=0,
    )

    repeated_a = extract_features(repeated.frame_a, "SIFT", nfeatures=2000)
    repeated_b = extract_features(repeated.frame_b, "SIFT", nfeatures=2000)
    with pytest.raises(StitchPipelineError) as excinfo:
        match_descriptors(
            repeated_a.descriptors,
            repeated_b.descriptors,
            repeated_a.keypoint_count,
            repeated_b.keypoint_count,
            "SIFT",
            ratio_threshold=0.75,
            min_ratio_passed_matches=1,
            pair=(0, 1),
            pair_index=0,
        )

    assert excinfo.value.code == "INSUFFICIENT_MATCHES"
    assert excinfo.value.context["matches"] < ordinary_result.ratio_passed_count


def test_pair_below_ratio_passed_floor_raises_insufficient_matches() -> None:
    pair = overlapping_pair(seed=1)
    features_a = extract_features(pair.frame_a, "SIFT", nfeatures=2000)
    features_b = extract_features(pair.frame_b, "SIFT", nfeatures=2000)

    with pytest.raises(StitchPipelineError) as excinfo:
        match_descriptors(
            features_a.descriptors,
            features_b.descriptors,
            features_a.keypoint_count,
            features_b.keypoint_count,
            "SIFT",
            ratio_threshold=0.75,
            min_ratio_passed_matches=10_000,
            pair=(2, 3),
            pair_index=1,
        )

    assert excinfo.value.code == "INSUFFICIENT_MATCHES"
    assert excinfo.value.context == {
        "pair": [2, 3],
        "pair_index": 1,
        "matches": excinfo.value.context["matches"],
        "required": 10_000,
    }
