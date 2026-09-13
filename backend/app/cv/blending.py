"""Mask-aware seam blending, crop, and encode boundary.

Gate 9 lives here: feather the overlap between valid masks, compensate a
simple per-image exposure gain, crop empty borders from the combined mask,
and encode PNG. Also projects the sampled inlier correspondences the overlay
draws (spec sections 7.4, 8, 11). Feather blending is the committed
strategy; multiband is a later change (`docs/cv-pipeline.md` section 7).
"""

import cv2
import numpy as np

_MAX_SAMPLE_CORRESPONDENCES = 12


def estimate_exposure_gains(
    warped_images: list[np.ndarray],
    valid_masks: list[np.ndarray],
) -> list[float]:
    """A simple sequential multiplicative gain so overlaps don't show a hard brightness step.

    Each image's gain is chased toward its predecessor's brightness over
    their shared overlap region; image 0 is the fixed reference at gain 1.0.
    """

    gains = [1.0] * len(warped_images)
    grays = [cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) for image in warped_images]

    for i in range(1, len(warped_images)):
        overlap = (valid_masks[i - 1] > 0) & (valid_masks[i] > 0)
        if overlap.sum() < 50:
            gains[i] = gains[i - 1]
            continue
        mean_previous = float(grays[i - 1][overlap].mean())
        mean_current = float(grays[i][overlap].mean())
        gains[i] = (
            gains[i - 1] if mean_current <= 1e-6 else gains[i - 1] * (mean_previous / mean_current)
        )

    return gains


def feather_blend(
    warped_images: list[np.ndarray],
    masks: list[np.ndarray],
    gains: list[float] | None = None,
) -> np.ndarray:
    """Blend warped images with distance-transform feather weights, in float space.

    Each image's weight at a pixel is its distance to the nearest edge of its
    own valid mask, so the blend favours each image's own interior over its
    edges; the two feathered maps are combined by weighted average before
    the single conversion back to 8-bit.
    """

    height, width = masks[0].shape[:2]
    accumulator = np.zeros((height, width, 3), dtype=np.float32)
    weight_sum = np.zeros((height, width), dtype=np.float32)
    scratch = np.empty((height, width), dtype=np.float32)
    if gains is None:
        gains = [1.0] * len(warped_images)

    for image, mask, gain in zip(warped_images, masks, gains, strict=True):
        binary_mask = (mask > 0).astype(np.uint8)
        weight = cv2.distanceTransform(binary_mask, cv2.DIST_L2, 5)
        for channel in range(3):
            # Preserve the original clipped uint8 gain semantics, one channel
            # at a time, without keeping another full set of graded images.
            np.multiply(image[..., channel], gain, out=scratch)
            np.clip(scratch, 0, 255, out=scratch)
            np.floor(scratch, out=scratch)
            scratch *= weight
            accumulator[..., channel] += scratch
        weight_sum += weight

    # Uncovered pixels have zero accumulated color; a denominator of one
    # preserves black without allocating another full RGB canvas.
    weight_sum[weight_sum <= 1e-6] = 1.0
    accumulator /= weight_sum[..., np.newaxis]
    np.clip(accumulator, 0, 255, out=accumulator)
    return accumulator.astype(np.uint8)


def blend_with_exposure_compensation(
    warped_images: list[np.ndarray],
    masks: list[np.ndarray],
) -> np.ndarray:
    """Compensate exposure, then feather-blend; the composition gate 9 actually runs."""

    gains = estimate_exposure_gains(warped_images, masks)
    return feather_blend(warped_images, masks, gains)


def _min_pool(binary_mask: np.ndarray, factor: int) -> np.ndarray:
    """Block-erode ``binary_mask`` by ``factor``: a pooled cell is 1 only when
    every pixel in its factor x factor block is 1 -- so scaling a rectangle of
    pooled cells back up is always a rectangle of genuinely all-valid pixels.
    """

    if factor <= 1:
        return binary_mask
    height, width = binary_mask.shape
    trimmed_height = (height // factor) * factor
    trimmed_width = (width // factor) * factor
    trimmed = binary_mask[:trimmed_height, :trimmed_width]
    reshaped = trimmed.reshape(trimmed_height // factor, factor, trimmed_width // factor, factor)
    return reshaped.min(axis=(1, 3))


def _largest_all_valid_rectangle(binary_mask: np.ndarray) -> tuple[int, int, int, int]:
    """Largest axis-aligned rectangle of all-1 cells, via the histogram method.

    Standard "maximal rectangle in a binary matrix" algorithm: track a
    per-column run-length histogram row by row, and solve "largest
    rectangle in histogram" (a monotonic stack) at each row.
    """

    rows, cols = binary_mask.shape
    heights = [0] * cols
    best_area = 0
    best_rect = (0, 0, cols, rows)

    for row in range(rows):
        for col in range(cols):
            heights[col] = heights[col] + 1 if binary_mask[row, col] else 0

        stack: list[tuple[int, int]] = []
        for col in range(cols + 1):
            current_height = heights[col] if col < cols else 0
            start = col
            while stack and stack[-1][1] >= current_height:
                start_index, stack_height = stack.pop()
                width = col - start_index
                area = stack_height * width
                if area > best_area:
                    best_area = area
                    best_rect = (start_index, row - stack_height + 1, col, row + 1)
                start = start_index
            stack.append((start, current_height))

    return best_rect


def crop_to_valid_region(
    image: np.ndarray, masks: list[np.ndarray]
) -> tuple[np.ndarray, tuple[int, int]]:
    """Crop to the largest rectangle entirely covered by the combined valid mask.

    A perspective warp rarely fills a rectangle exactly, so cropping to the
    union mask's bounding box (rather than an inscribed rectangle) leaves
    black triangles in the corners -- exactly the "distorted image passed
    off as a result" standing rule 01 forbids. The crop is derived from the
    mask's actual shape, not a fixed inset. Returns the cropped image and
    the ``(x, y)`` offset removed, which the sampled-correspondence
    projection must subtract too.
    """

    combined = np.zeros(masks[0].shape[:2], dtype=np.uint8)
    for mask in masks:
        binary = np.where(mask > 0, 255, 0).astype(np.uint8)
        combined = cv2.bitwise_or(combined, binary).astype(np.uint8)

    binary_mask = (combined > 0).astype(np.uint8)
    if not binary_mask.any():
        return image, (0, 0)

    # Search a coarsened grid for speed, using min-pooling so every pooled
    # cell that reads "valid" truly covers an all-valid block once scaled
    # back up -- the result is always a genuinely border-free rectangle.
    height, width = binary_mask.shape
    factor = max(1, min(height, width) // 150)
    pooled = _min_pool(binary_mask, factor)

    x0, y0, x1, y1 = _largest_all_valid_rectangle(pooled)
    x0, y0, x1, y1 = x0 * factor, y0 * factor, x1 * factor, y1 * factor

    if x1 <= x0 or y1 <= y0:
        return image, (0, 0)
    return image[y0:y1, x0:x1], (x0, y0)


def encode_png(image: np.ndarray) -> bytes:
    """Encode a BGR uint8 array as PNG bytes. PNG only; no JPEG path exists."""

    ok, buffer = cv2.imencode(".png", image)
    if not ok:
        raise RuntimeError("PNG encoding failed")
    return buffer.tobytes()


def sample_correspondences_for_pair(
    source_points: np.ndarray,
    destination_points: np.ndarray,
    source_transform_to_canvas: np.ndarray,
    destination_transform_to_canvas: np.ndarray,
    crop_offset: tuple[int, int],
    max_points: int = _MAX_SAMPLE_CORRESPONDENCES,
) -> list[dict[str, list[float]]]:
    """Project up to 12 inlier correspondences onto the cropped output canvas.

    This is a drawn illustration for the overlay, never a measurement: its
    length must never be reported or treated as the inlier count, which is
    ``inliers_per_pair`` and nowhere else (spec section 8).
    """

    if len(source_points) == 0:
        return []

    step = max(1, len(source_points) // max_points)
    sampled_source = source_points[::step][:max_points]
    sampled_destination = destination_points[::step][:max_points]

    projected_source = cv2.perspectiveTransform(
        sampled_source.reshape(-1, 1, 2).astype(np.float32), source_transform_to_canvas
    ).reshape(-1, 2)
    projected_destination = cv2.perspectiveTransform(
        sampled_destination.reshape(-1, 1, 2).astype(np.float32), destination_transform_to_canvas
    ).reshape(-1, 2)

    offset_x, offset_y = crop_offset
    return [
        {
            "from": [float(fx - offset_x), float(fy - offset_y)],
            "to": [float(tx - offset_x), float(ty - offset_y)],
        }
        for (fx, fy), (tx, ty) in zip(projected_source, projected_destination, strict=True)
    ]
