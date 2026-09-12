"""Gate 7: RANSAC and pair acceptance (task 07f)."""

import cv2
import numpy as np
import pytest

from app.core.errors import StitchPipelineError
from app.cv.features import extract_features
from app.cv.homography import classify_degeneracy, estimate_homography
from app.tests.conftest import (
    ORB_MAX_CORNER_ERROR_PX,
    ORB_MIN_INLIER_RATIO,
    SIFT_MAX_CORNER_ERROR_PX,
    SIFT_MAX_REPROJECTION_ERROR_PX,
    SIFT_MIN_INLIER_RATIO,
    corner_error_px,
)
from app.tests.fixtures import non_overlapping_pair, overlapping_pair


def _match_points(
    frame_a: np.ndarray, frame_b: np.ndarray, detector: str
) -> tuple[np.ndarray, np.ndarray]:
    features_a = extract_features(frame_a, detector, nfeatures=2000)
    features_b = extract_features(frame_b, detector, nfeatures=2000)
    norm_type = cv2.NORM_L2 if detector == "SIFT" else cv2.NORM_HAMMING
    matcher = cv2.BFMatcher(norm_type)
    knn = matcher.knnMatch(features_a.descriptors, features_b.descriptors, k=2)
    good = [m for m, n in knn if m.distance < 0.75 * n.distance]
    src = np.float32([features_a.keypoints[m.queryIdx].pt for m in good])
    dst = np.float32([features_b.keypoints[m.trainIdx].pt for m in good])
    return src, dst


def test_sift_pair_clears_the_spec_12_3_bar() -> None:
    pair = overlapping_pair(seed=1)
    src, dst = _match_points(pair.frame_a, pair.frame_b, "SIFT")

    result = estimate_homography(
        src,
        dst,
        image_size=(pair.frame_a.shape[1], pair.frame_a.shape[0]),
        ransac_reproj_threshold=5.0,
        min_inliers=12,
        min_inlier_ratio=0.25,
        max_reprojection_error=20.0,
        pair=(0, 1),
        pair_index=0,
    )

    assert result.inlier_ratio >= SIFT_MIN_INLIER_RATIO
    assert result.reprojection_error <= SIFT_MAX_REPROJECTION_ERROR_PX
    error = corner_error_px(pair.frame_a.shape, pair.homography_ab, result.matrix)
    assert error.max() <= SIFT_MAX_CORNER_ERROR_PX


def test_orb_pair_clears_the_spec_12_3_bar() -> None:
    pair = overlapping_pair(seed=1)
    src, dst = _match_points(pair.frame_a, pair.frame_b, "ORB")

    result = estimate_homography(
        src,
        dst,
        image_size=(pair.frame_a.shape[1], pair.frame_a.shape[0]),
        ransac_reproj_threshold=5.0,
        min_inliers=12,
        min_inlier_ratio=0.25,
        max_reprojection_error=20.0,
        pair=(0, 1),
        pair_index=0,
    )

    assert result.inlier_ratio >= ORB_MIN_INLIER_RATIO
    error = corner_error_px(pair.frame_a.shape, pair.homography_ab, result.matrix)
    assert error.max() <= ORB_MAX_CORNER_ERROR_PX


def test_reprojection_error_matches_hand_computed_value() -> None:
    matrix = np.eye(3, dtype=np.float64)
    matrix_inv = np.eye(3, dtype=np.float64)
    source = np.array([[0.0, 0.0], [10.0, 0.0], [10.0, 10.0], [0.0, 10.0]], dtype=np.float32)
    # A pure identity transform with a fixed offset of (3, 4) on every point,
    # so the symmetric transfer error is exactly 5.0 px for each and the
    # median across the four is unambiguous.
    destination = source + np.array([3.0, 4.0], dtype=np.float32)

    from app.cv.homography import _symmetric_transfer_errors

    errors = _symmetric_transfer_errors(matrix, matrix_inv, source, destination)

    assert np.allclose(errors, 5.0)
    assert float(np.median(errors)) == pytest.approx(5.0)


def test_inlier_ratio_denominator_is_ratio_passed_matches() -> None:
    pair = overlapping_pair(seed=1)
    src, dst = _match_points(pair.frame_a, pair.frame_b, "SIFT")

    result = estimate_homography(
        src,
        dst,
        image_size=(pair.frame_a.shape[1], pair.frame_a.shape[0]),
        ransac_reproj_threshold=5.0,
        min_inliers=12,
        min_inlier_ratio=0.25,
        max_reprojection_error=20.0,
        pair=(0, 1),
        pair_index=0,
    )

    assert result.inlier_ratio == pytest.approx(result.inlier_count / len(src))


def test_non_overlapping_pair_raises_insufficient_inliers_and_returns_no_matrix() -> None:
    pair = non_overlapping_pair(seed=1)
    src, dst = _match_points(pair.frame_a, pair.frame_b, "SIFT")

    with pytest.raises(StitchPipelineError) as excinfo:
        estimate_homography(
            src,
            dst,
            image_size=(pair.frame_a.shape[1], pair.frame_a.shape[0]),
            ransac_reproj_threshold=5.0,
            min_inliers=12,
            min_inlier_ratio=0.25,
            max_reprojection_error=3.0,
            pair=(0, 1),
            pair_index=0,
        )

    assert excinfo.value.code == "INSUFFICIENT_INLIERS"
    assert "inliers" in excinfo.value.context
    assert "inlier_ratio" in excinfo.value.context


def test_too_few_correspondences_raises_degenerate_homography_singular() -> None:
    source = np.float32([[0, 0], [1, 1], [2, 2]])
    destination = np.float32([[0, 0], [1, 1], [2, 2]])

    with pytest.raises(StitchPipelineError) as excinfo:
        estimate_homography(
            source,
            destination,
            image_size=(100, 100),
            ransac_reproj_threshold=5.0,
            min_inliers=4,
            min_inlier_ratio=0.25,
            max_reprojection_error=3.0,
            pair=(0, 1),
            pair_index=0,
        )

    assert excinfo.value.code == "DEGENERATE_HOMOGRAPHY"
    assert excinfo.value.context["reason"] == "singular"


@pytest.mark.parametrize(
    ("matrix", "expected_reason"),
    [
        (np.array([[1.0, 0.0, np.nan], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]]), "non_finite"),
        (np.zeros((3, 3)), "singular"),
        (
            # A perspective term steep enough that the rectangle straddles
            # the vanishing line, folding two corners onto the wrong side and
            # producing a self-intersecting ("bowtie") projected quad.
            np.array([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [-0.02, 0.0, 1.0]]),
            "non_convex_quad",
        ),
        (np.diag([50.0, 50.0, 1.0]), "excessive_scale"),
    ],
)
def test_classify_degeneracy_covers_all_four_reasons(
    matrix: np.ndarray, expected_reason: str
) -> None:
    assert classify_degeneracy(matrix, image_size=(100, 100)) == expected_reason


def test_classify_degeneracy_accepts_a_healthy_matrix() -> None:
    matrix = np.array([[1.0, 0.0, 5.0], [0.0, 1.0, 5.0], [0.0, 0.0, 1.0]])

    assert classify_degeneracy(matrix, image_size=(100, 100)) is None
