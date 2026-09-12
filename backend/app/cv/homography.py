"""Homography/RANSAC seam for pairwise geometric verification.

Gate 7 lives here: a pair is accepted only when its estimated homography is
finite, non-singular, keeps a convex projected quadrilateral, holds a
plausible scale, and clears the inlier count/ratio and reprojection-error
bars (spec section 3 gate 7, section 7.3, section 9). No warping, cropping,
or blending happens in this module.
"""

from dataclasses import dataclass

import cv2
import numpy as np

from app.core.errors import degenerate_homography, insufficient_inliers

# Below this many correspondences cv2.findHomography cannot even attempt a
# fit; gate 6's floor (>= 8 by range) already guarantees this in practice, so
# this is a structural safety net, not a tunable threshold.
_MIN_CORRESPONDENCES = 4


@dataclass(frozen=True)
class HomographyResult:
    """Geometric result and diagnostics for one accepted pair."""

    matrix: np.ndarray
    inlier_mask: np.ndarray
    inlier_count: int
    inlier_ratio: float
    reprojection_error: float


def _polygon_area(points: np.ndarray) -> float:
    """Shoelace-formula area of an ordered polygon."""

    x, y = points[:, 0], points[:, 1]
    return 0.5 * abs(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def _is_convex(points: np.ndarray) -> bool:
    """True when every turn around the polygon has the same orientation."""

    count = len(points)
    cross_signs = []
    for i in range(count):
        p0, p1, p2 = points[i], points[(i + 1) % count], points[(i + 2) % count]
        edge1 = p1 - p0
        edge2 = p2 - p1
        cross_signs.append(edge1[0] * edge2[1] - edge1[1] * edge2[0])
    signs = np.array(cross_signs)
    return bool(np.all(signs > 0) or np.all(signs < 0))


def classify_degeneracy(matrix: np.ndarray | None, image_size: tuple[int, int]) -> str | None:
    """Return a spec section 9 ``reason`` when ``matrix`` is unusable, else None.

    Exposed as its own function so each of the four reasons
    (``non_finite``, ``singular``, ``non_convex_quad``, ``excessive_scale``)
    can be exercised with a hand-built matrix, independent of whether a real
    correspondence set happens to trigger it through RANSAC.
    """

    if matrix is None or not np.all(np.isfinite(matrix)):
        return "non_finite"

    determinant = np.linalg.det(matrix)
    if not np.isfinite(determinant) or abs(determinant) < 1e-9:
        return "singular"

    width, height = image_size
    corner_points = [[0, 0], [width, 0], [width, height], [0, height]]
    corners = np.array(corner_points, dtype=np.float32).reshape(-1, 1, 2)
    try:
        projected = cv2.perspectiveTransform(corners, matrix).reshape(-1, 2)
    except cv2.error:
        return "non_finite"
    if not np.all(np.isfinite(projected)):
        return "non_finite"

    if not _is_convex(projected):
        return "non_convex_quad"

    original_area = float(width * height)
    if original_area <= 0:
        return "singular"
    scale = _polygon_area(projected) / original_area
    if scale < 0.04 or scale > 25.0:
        return "excessive_scale"

    return None


def _symmetric_transfer_errors(
    matrix: np.ndarray,
    matrix_inverse: np.ndarray,
    source_points: np.ndarray,
    destination_points: np.ndarray,
) -> np.ndarray:
    """Per-correspondence symmetric transfer error (spec section 7.3)."""

    forward = cv2.perspectiveTransform(source_points.reshape(-1, 1, 2), matrix).reshape(-1, 2)
    backward = cv2.perspectiveTransform(
        destination_points.reshape(-1, 1, 2), matrix_inverse
    ).reshape(-1, 2)
    forward_error = np.linalg.norm(forward - destination_points, axis=1)
    backward_error = np.linalg.norm(backward - source_points, axis=1)
    return 0.5 * (forward_error + backward_error)


def estimate_homography(
    source_points: np.ndarray,
    destination_points: np.ndarray,
    image_size: tuple[int, int],
    ransac_reproj_threshold: float,
    min_inliers: int,
    min_inlier_ratio: float,
    max_reprojection_error: float,
    pair: tuple[int, int],
    pair_index: int,
) -> HomographyResult:
    """Estimate a robust transform with OpenCV RANSAC and apply gate 7.

    ``source_points``/``destination_points`` are the ratio-passed match
    coordinates for this pair; their count is the inlier ratio's denominator
    (spec section 7.3), so no separate count needs to be threaded through.
    """

    if len(source_points) < _MIN_CORRESPONDENCES:
        raise degenerate_homography(pair, pair_index, "singular")

    matrix, mask = cv2.findHomography(
        source_points, destination_points, cv2.RANSAC, ransac_reproj_threshold
    )

    if matrix is None:
        raise degenerate_homography(pair, pair_index, "non_finite")

    # Inlier agreement is checked before the shape of the matrix itself: a
    # pair with too little real overlap can still produce *some* matrix, but
    # "not enough geometric agreement" (few/weak inliers) is a different
    # failure from "the geometry found doesn't make sense" (degenerate), and
    # spec section 12.3's non-overlapping fixture must land on the former.
    inlier_mask = mask.ravel().astype(bool)
    inlier_count = int(inlier_mask.sum())
    ratio_passed_count = len(source_points)
    inlier_ratio = inlier_count / ratio_passed_count if ratio_passed_count else 0.0

    if inlier_count < min_inliers or inlier_ratio < min_inlier_ratio:
        raise insufficient_inliers(pair, pair_index, inlier_count, min_inliers, inlier_ratio)

    reason = classify_degeneracy(matrix, image_size)
    if reason is not None:
        raise degenerate_homography(pair, pair_index, reason)

    matrix_inverse = np.linalg.inv(matrix)
    errors = _symmetric_transfer_errors(
        matrix,
        matrix_inverse,
        source_points[inlier_mask],
        destination_points[inlier_mask],
    )
    reprojection_error = float(np.median(errors))

    if reprojection_error > max_reprojection_error:
        raise insufficient_inliers(pair, pair_index, inlier_count, min_inliers, inlier_ratio)

    return HomographyResult(
        matrix=matrix,
        inlier_mask=inlier_mask,
        inlier_count=inlier_count,
        inlier_ratio=inlier_ratio,
        reprojection_error=reprojection_error,
    )
