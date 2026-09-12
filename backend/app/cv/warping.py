"""Canvas bounds and perspective-warp seam.

Gate 8's canvas-size check lives here: a union canvas that would exceed
``max_output_pixels`` is rejected outright and never shrunk (standing rule
01 -- an oversized canvas after the section 5 input budget means the
geometry is wrong, not that the picture needs to be smaller). ``seam_lines``
is produced here too, since the shared boundary between a pair is a
by-product of the corner projection this module already does for the canvas
bounds (spec section 8). No blending or cropping happens in this module.
"""

from dataclasses import dataclass

import cv2
import numpy as np

from app.core.errors import canvas_too_large


@dataclass(frozen=True)
class WarpResult:
    """Every warped image and mask on one shared canvas, plus seam geometry.

    ``translation`` is exposed so a caller projecting other points (the
    sampled inlier correspondences) into this same canvas space can reuse
    exactly the transform this stage used, rather than recomputing it.
    """

    canvas_width: int
    canvas_height: int
    warped_images: list[np.ndarray]
    valid_masks: list[np.ndarray]
    seam_lines: list[dict[str, list[float]]]
    translation: np.ndarray


def _corners(width: int, height: int) -> np.ndarray:
    corners = [[0, 0], [width, 0], [width, height], [0, height]]
    return np.array(corners, dtype=np.float32).reshape(-1, 1, 2)


def compute_canvas_bounds(
    image_sizes: list[tuple[int, int]],
    transforms: list[np.ndarray],
) -> tuple[int, int, np.ndarray]:
    """Project every image's corners and return the union canvas plus its translation.

    Computed from the projected corners of every image, not from a sum of
    widths, so a rotated or perspective-heavy pair still yields the true
    bounding rectangle.
    """

    projected_corners = [
        cv2.perspectiveTransform(_corners(width, height), transform).reshape(-1, 2)
        for (width, height), transform in zip(image_sizes, transforms, strict=True)
    ]
    all_points = np.vstack(projected_corners)
    min_x, min_y = all_points.min(axis=0)
    max_x, max_y = all_points.max(axis=0)

    canvas_width = int(np.ceil(max_x - min_x))
    canvas_height = int(np.ceil(max_y - min_y))
    translation = np.array(
        [[1.0, 0.0, -min_x], [0.0, 1.0, -min_y], [0.0, 0.0, 1.0]], dtype=np.float64
    )
    return canvas_width, canvas_height, translation


def _seam_lines(
    image_sizes: list[tuple[int, int]],
    transforms: list[np.ndarray],
    translation: np.ndarray,
) -> list[dict[str, list[float]]]:
    """The right edge of image i, projected onto the canvas, for each adjacent pair.

    Image i and image i+1 are adjacent captures of a continuous pan; image
    i's right edge stands in for the boundary the two share. A pure
    horizontal pan keeps this line vertical; real perspective tilts it,
    which is exactly what the overlay exists to show (spec section 8).
    """

    seams = []
    for i in range(len(image_sizes) - 1):
        width, height = image_sizes[i]
        edge = np.array([[width, 0], [width, height]], dtype=np.float32).reshape(-1, 1, 2)
        full_transform = translation @ transforms[i]
        projected = cv2.perspectiveTransform(edge, full_transform).reshape(-1, 2)
        seams.append(
            {
                "top": [float(projected[0][0]), float(projected[0][1])],
                "bottom": [float(projected[1][0]), float(projected[1][1])],
            }
        )
    return seams


def warp_to_common_canvas(
    images: list[np.ndarray],
    transforms: list[np.ndarray],
    max_output_pixels: int,
) -> WarpResult:
    """Warp every image and its validity mask onto one shared, bounds-checked canvas."""

    image_sizes = [(image.shape[1], image.shape[0]) for image in images]
    canvas_width, canvas_height, translation = compute_canvas_bounds(image_sizes, transforms)

    pixels = canvas_width * canvas_height
    if pixels > max_output_pixels:
        raise canvas_too_large(pixels, max_output_pixels, canvas_width, canvas_height)

    warped_images: list[np.ndarray] = []
    valid_masks: list[np.ndarray] = []
    for image, transform in zip(images, transforms, strict=True):
        full_transform = translation @ transform
        warped = cv2.warpPerspective(image, full_transform, (canvas_width, canvas_height))
        source_mask = np.full(image.shape[:2], 255, dtype=np.uint8)
        mask = cv2.warpPerspective(
            source_mask,
            full_transform,
            (canvas_width, canvas_height),
            flags=cv2.INTER_NEAREST,
        )
        warped_images.append(warped)
        valid_masks.append(mask)

    seam_lines = _seam_lines(image_sizes, transforms, translation)

    return WarpResult(
        canvas_width, canvas_height, warped_images, valid_masks, seam_lines, translation
    )
