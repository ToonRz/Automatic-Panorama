"""Homography/RANSAC seam for pairwise geometric verification."""

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class HomographyResult:
    """Future geometric result and diagnostics."""

    matrix: np.ndarray
    inlier_mask: np.ndarray
    inlier_count: int
    inlier_ratio: float
    reprojection_error: float


def estimate_homography(
    source_points: np.ndarray,
    destination_points: np.ndarray,
    ransac_reproj_threshold: float = 5.0,
) -> HomographyResult:
    """Estimate a robust transform with OpenCV RANSAC.

    TODO(Member B): call ``cv2.findHomography`` and calculate reprojection
    error, then reject non-finite/degenerate results in the pipeline layer.
    """

    del source_points, destination_points, ransac_reproj_threshold
    raise NotImplementedError("Homography/RANSAC is the next implementation slice.")
