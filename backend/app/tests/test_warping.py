"""Gate 8 canvas bounds, perspective warp, and seam lines (task 07h)."""

import numpy as np
import pytest

from app.core.errors import StitchPipelineError
from app.cv.warping import compute_canvas_bounds, warp_to_common_canvas
from app.tests.fixtures import oversized_canvas_transforms


def test_canvas_bounds_come_from_projected_corners_not_summed_widths() -> None:
    size = (200, 100)
    identity = np.eye(3, dtype=np.float64)
    # A 45-degree rotation about the origin blows the bounding box well past
    # a naive "sum of widths" estimate, which would predict 400 x 100.
    theta = np.radians(45)
    rotation = np.array(
        [
            [np.cos(theta), -np.sin(theta), 200.0],
            [np.sin(theta), np.cos(theta), 0.0],
            [0.0, 0.0, 1.0],
        ]
    )

    width, height, _ = compute_canvas_bounds([size, size], [identity, rotation])

    naive_width_estimate = size[0] * 2
    assert width != naive_width_estimate
    assert height > size[1]


def test_oversized_canvas_raises_canvas_too_large_and_returns_nothing() -> None:
    sizes, transforms = oversized_canvas_transforms()

    with pytest.raises(StitchPipelineError) as excinfo:
        warp_to_common_canvas(
            [np.zeros((sizes[0][1], sizes[0][0], 3), dtype=np.uint8) for _ in sizes],
            transforms,
            max_output_pixels=8_000_000,
        )

    assert excinfo.value.code == "CANVAS_TOO_LARGE"
    for key in ("pixels", "limit", "width", "height"):
        assert key in excinfo.value.context


def test_validity_mask_is_empty_exactly_where_the_warp_wrote_nothing() -> None:
    size = (100, 80)
    identity = np.eye(3, dtype=np.float64)
    shifted = np.array([[1.0, 0.0, 50.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]])
    images = [np.full((size[1], size[0], 3), 255, dtype=np.uint8) for _ in range(2)]

    result = warp_to_common_canvas(images, [identity, shifted], max_output_pixels=1_000_000)

    mask_a, mask_b = result.valid_masks
    # image A occupies the left region of the canvas; the far right strip is
    # only covered by image B's shift, so image A's mask must be empty there.
    assert mask_a[:, result.canvas_width - 1].max() == 0
    assert mask_b[:, result.canvas_width - 1].max() > 0


def test_seam_lines_are_non_vertical_for_a_rotated_pair() -> None:
    size = (200, 150)
    identity = np.eye(3, dtype=np.float64)
    theta = np.radians(12)
    # The seam for pair (0, 1) is projected through image 0's own transform,
    # so the rotation belongs on transforms[0] here -- matching how
    # cv/pipeline.py sets up a 2-image chain, where image 1 is the reference
    # (identity) and image 0 carries the estimated pairwise homography.
    rotated = np.array(
        [
            [np.cos(theta), -np.sin(theta), 140.0],
            [np.sin(theta), np.cos(theta), 10.0],
            [0.0, 0.0, 1.0],
        ]
    )
    images = [np.zeros((size[1], size[0], 3), dtype=np.uint8) for _ in range(2)]

    result = warp_to_common_canvas(images, [rotated, identity], max_output_pixels=2_000_000)

    assert len(result.seam_lines) == 1
    seam = result.seam_lines[0]
    dx = seam["bottom"][0] - seam["top"][0]
    assert abs(dx) > 1.0


def test_seam_lines_stay_vertical_for_a_pure_horizontal_pan() -> None:
    size = (200, 150)
    identity = np.eye(3, dtype=np.float64)
    pan = np.array([[1.0, 0.0, 140.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]])
    images = [np.zeros((size[1], size[0], 3), dtype=np.uint8) for _ in range(2)]

    result = warp_to_common_canvas(images, [identity, pan], max_output_pixels=2_000_000)

    seam = result.seam_lines[0]
    assert seam["top"][0] == pytest.approx(seam["bottom"][0], abs=1e-6)


def test_seam_line_is_image_zeros_right_edge_for_a_left_to_right_pan() -> None:
    size = (200, 150)
    identity = np.eye(3, dtype=np.float64)
    pan = np.array([[1.0, 0.0, 140.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]])
    images = [np.zeros((size[1], size[0], 3), dtype=np.uint8) for _ in range(2)]

    # Image 0 spans x 0-200, image 1 spans x 140-340: the shared boundary is x=200.
    result = warp_to_common_canvas(images, [identity, pan], max_output_pixels=2_000_000)

    assert result.seam_lines[0]["top"][0] == pytest.approx(200.0, abs=1e-3)


def test_seam_line_is_image_zeros_left_edge_for_a_right_to_left_pan() -> None:
    size = (200, 150)
    identity = np.eye(3, dtype=np.float64)
    pan = np.array([[1.0, 0.0, 140.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]])
    images = [np.zeros((size[1], size[0], 3), dtype=np.uint8) for _ in range(2)]

    # Image 0 spans x 140-340, image 1 spans x 0-200. Image 0's right edge
    # (x=340) is the canvas border, not a seam; the boundary is x=140.
    result = warp_to_common_canvas(images, [pan, identity], max_output_pixels=2_000_000)

    assert result.seam_lines[0]["top"][0] == pytest.approx(140.0, abs=1e-3)


def test_every_seam_of_a_right_to_left_chain_lies_inside_the_canvas() -> None:
    size = (200, 150)
    step = np.array([[1.0, 0.0, -140.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]])
    transforms = [np.eye(3, dtype=np.float64), step, step @ step]
    images = [np.zeros((size[1], size[0], 3), dtype=np.uint8) for _ in range(3)]

    result = warp_to_common_canvas(images, transforms, max_output_pixels=2_000_000)

    assert len(result.seam_lines) == 2
    for seam in result.seam_lines:
        assert 0.0 < seam["top"][0] < result.canvas_width
