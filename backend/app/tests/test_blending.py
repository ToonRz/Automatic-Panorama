"""Gate 9 blending, crop, encode, and sampled correspondences (task 07i)."""

import cv2
import numpy as np
import pytest

from app.cv.blending import (
    crop_to_valid_region,
    encode_png,
    estimate_exposure_gains,
    feather_blend,
    sample_correspondences_for_pair,
)


def _two_image_scene(left_color: tuple[int, int, int], right_color: tuple[int, int, int]):
    width, height = 200, 100
    left = np.zeros((height, width, 3), dtype=np.uint8)
    left[:, :140] = left_color
    right = np.zeros((height, width, 3), dtype=np.uint8)
    right[:, 60:] = right_color

    left_mask = np.zeros((height, width), dtype=np.uint8)
    left_mask[:, :140] = 255
    right_mask = np.zeros((height, width), dtype=np.uint8)
    right_mask[:, 60:] = 255
    return [left, right], [left_mask, right_mask]


def test_feather_blend_mixes_the_overlap_in_float_space() -> None:
    images, masks = _two_image_scene((200, 0, 0), (0, 0, 200))

    blended = feather_blend(images, masks)

    overlap_pixel = blended[50, 100]
    assert overlap_pixel[0] > 0 and overlap_pixel[2] > 0  # both colors present
    left_only = blended[50, 10]
    assert tuple(int(c) for c in left_only) == (200, 0, 0)


def test_misaligned_overlap_is_not_hidden_by_the_blend() -> None:
    """Standing rule 01: a bad alignment must stay visible, not be smoothed away."""

    images, masks = _two_image_scene((200, 0, 0), (0, 0, 200))

    blended = feather_blend(images, masks)

    overlap_pixel = blended[50, 100].astype(int)
    # A genuine mix shows both source channels, unlike either image alone.
    assert overlap_pixel[0] > 0
    assert overlap_pixel[2] > 0
    assert not np.array_equal(overlap_pixel, [200, 0, 0])
    assert not np.array_equal(overlap_pixel, [0, 0, 200])


def test_crop_derives_from_the_combined_mask_not_a_fixed_inset() -> None:
    height, width = 100, 200
    mask_a = np.zeros((height, width), dtype=np.uint8)
    mask_a[10:90, 20:120] = 255
    mask_b = np.zeros((height, width), dtype=np.uint8)
    mask_b[10:90, 80:180] = 255
    image = np.random.default_rng(0).integers(0, 255, size=(height, width, 3), dtype=np.uint8)

    cropped, offset = crop_to_valid_region(image, [mask_a, mask_b])

    # The two masks' union is exactly the filled rectangle [20,180)x[10,90),
    # so the largest all-valid rectangle should recover it (up to the
    # coarsening the search uses for speed on large canvases).
    assert offset == (20, 10)
    assert cropped.shape[:2] == (90 - 10, 180 - 20)


def test_crop_never_includes_an_uncovered_corner() -> None:
    """A union shaped like an L must not crop to its (partly uncovered) bounding box."""

    height, width = 100, 200
    mask_a = np.zeros((height, width), dtype=np.uint8)
    mask_a[10:60, 20:120] = 255
    mask_b = np.zeros((height, width), dtype=np.uint8)
    mask_b[30:90, 80:180] = 255
    image = np.zeros((height, width, 3), dtype=np.uint8)

    cropped, (x0, y0) = crop_to_valid_region(image, [mask_a, mask_b])

    combined = cv2.bitwise_or(mask_a, mask_b)
    region = combined[y0 : y0 + cropped.shape[0], x0 : x0 + cropped.shape[1]]
    assert region.all()


def test_encode_png_round_trips_and_is_a_real_png() -> None:
    image = np.zeros((10, 10, 3), dtype=np.uint8)
    image[:] = (10, 20, 30)

    payload = encode_png(image)

    assert payload[:8] == b"\x89PNG\r\n\x1a\n"
    decoded = cv2.imdecode(np.frombuffer(payload, dtype=np.uint8), cv2.IMREAD_COLOR)
    assert decoded.shape == image.shape
    assert np.array_equal(decoded, image)


def test_sample_correspondences_never_exceed_twelve_per_pair() -> None:
    rng = np.random.default_rng(1)
    source = rng.uniform(0, 100, size=(50, 2)).astype(np.float32)
    destination = source + 5.0
    identity = np.eye(3, dtype=np.float64)

    correspondences = sample_correspondences_for_pair(
        source, destination, identity, identity, (0, 0)
    )

    assert 0 < len(correspondences) <= 12
    for entry in correspondences:
        assert set(entry.keys()) == {"from", "to"}
        assert len(entry["from"]) == 2
        assert len(entry["to"]) == 2


def test_sample_correspondences_subtracts_the_crop_offset() -> None:
    source = np.array([[10.0, 10.0]], dtype=np.float32)
    destination = np.array([[10.0, 10.0]], dtype=np.float32)
    identity = np.eye(3, dtype=np.float64)

    correspondences = sample_correspondences_for_pair(
        source, destination, identity, identity, (5, 3)
    )

    assert correspondences[0]["from"] == [5.0, 7.0]
    assert correspondences[0]["to"] == [5.0, 7.0]


def test_exposure_gain_compensates_a_brighter_second_image() -> None:
    height, width = 60, 60
    dim = np.full((height, width, 3), 80, dtype=np.uint8)
    bright = np.full((height, width, 3), 160, dtype=np.uint8)
    full_mask = np.full((height, width), 255, dtype=np.uint8)

    gains = estimate_exposure_gains([dim, bright], [full_mask, full_mask])

    assert gains[0] == 1.0
    assert gains[1] == pytest.approx(0.5, rel=0.05)


def test_compensated_blend_matches_reference_without_mutating_inputs() -> None:
    from app.cv.blending import blend_with_exposure_compensation

    images, masks = _two_image_scene((90, 120, 150), (60, 80, 100))
    originals = [image.copy() for image in images]
    gains = estimate_exposure_gains(images, masks)
    graded = [
        np.clip(image.astype(np.float64) * gain, 0, 255).astype(np.uint8)
        for image, gain in zip(images, gains, strict=True)
    ]
    expected = feather_blend(graded, masks)
    actual = blend_with_exposure_compensation(images, masks)
    np.testing.assert_allclose(actual, expected, atol=1)
    for image, original in zip(images, originals, strict=True):
        np.testing.assert_array_equal(image, original)


def test_compensated_blend_temporary_memory_stays_bounded() -> None:
    import tracemalloc

    from app.cv.blending import blend_with_exposure_compensation

    height, width = 800, 1200
    images = [np.full((height, width, 3), value, np.uint8) for value in (80, 100, 120)]
    masks = [np.full((height, width), 255, np.uint8) for _ in images]
    tracemalloc.start()
    try:
        result = blend_with_exposure_compensation(images, masks)
        _, peak = tracemalloc.get_traced_memory()
    finally:
        tracemalloc.stop()
    assert result.shape == images[0].shape
    # Reserve at most 60 bytes/pixel of scratch space, excluding caller-owned inputs.
    assert peak < height * width * 60
