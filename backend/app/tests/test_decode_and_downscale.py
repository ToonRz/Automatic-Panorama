"""Gate 4: decode, pixel ceiling, and the per-request downscale budget (task 07c)."""

import cv2
import numpy as np
import pytest

from app.core.errors import StitchPipelineError
from app.services import stitcher
from app.services.stitcher import decode_and_downscale, input_long_edge_budget


def _png_bytes(width: int, height: int) -> bytes:
    image = np.random.default_rng(0).integers(0, 255, size=(height, width, 3), dtype=np.uint8)
    ok, buffer = cv2.imencode(".png", image)
    assert ok
    return buffer.tobytes()


# spec section 5.2's table, reproduced exactly at the documented defaults.
_EXPECTED_BUDGET_BY_COUNT = {
    2: 1600,
    3: 1600,
    4: 1498,
    5: 1353,
    6: 1243,
    7: 1156,
    8: 1085,
}


@pytest.mark.parametrize(
    ("image_count", "expected_budget"), list(_EXPECTED_BUDGET_BY_COUNT.items())
)
def test_input_long_edge_budget_matches_spec_table_exactly(
    settings, image_count: int, expected_budget: int
) -> None:
    assert input_long_edge_budget(image_count, settings) == expected_budget


def test_resizing_only_shrinks_and_in_budget_image_keeps_exact_scale_one(settings) -> None:
    payload = _png_bytes(400, 300)  # well inside the 2-image budget of 1600

    decoded, _budget = decode_and_downscale([payload, payload], settings)

    for item in decoded:
        assert item.processed_dimensions == item.source_dimensions
        assert item.scale_factor == 1.0


def test_oversized_image_is_downscaled_and_never_upscaled(settings) -> None:
    payload = _png_bytes(3000, 2000)  # long edge exceeds the 2-image budget of 1600

    decoded, budget = decode_and_downscale([payload, payload], settings)

    for item in decoded:
        assert max(item.processed_dimensions) == budget
        assert item.scale_factor < 1.0
        assert item.processed_dimensions[0] <= item.source_dimensions[0]
        assert item.processed_dimensions[1] <= item.source_dimensions[1]


def test_decode_failure_raises_decode_failed_with_zero_based_index(settings) -> None:
    good = _png_bytes(200, 200)
    garbage = b"this is not an image"

    with pytest.raises(StitchPipelineError) as excinfo:
        decode_and_downscale([good, garbage], settings)

    assert excinfo.value.code == "DECODE_FAILED"
    assert excinfo.value.context["image"] == 1


def test_image_over_pixel_ceiling_raises_before_resize(settings) -> None:
    settings.max_image_pixels = 100  # force the ceiling far below any real image
    payload = _png_bytes(200, 200)

    with pytest.raises(StitchPipelineError) as excinfo:
        decode_and_downscale([payload, payload], settings)

    assert excinfo.value.code == "IMAGE_TOO_MANY_PIXELS"
    assert excinfo.value.context["image"] == 0
    assert excinfo.value.context["pixels"] == 200 * 200


def test_manifest_preserves_upload_order_and_per_image_fields(settings) -> None:
    small = _png_bytes(300, 200)
    large = _png_bytes(3000, 1500)

    decoded, _budget = decode_and_downscale([small, large], settings)

    assert decoded[0].source_dimensions == (300, 200)
    assert decoded[1].source_dimensions == (3000, 1500)


def test_portrait_and_landscape_frames_each_resize_against_their_own_long_edge(settings) -> None:
    landscape = _png_bytes(3000, 1200)  # long edge is width
    portrait = _png_bytes(1200, 3000)  # long edge is height

    decoded, budget = decode_and_downscale([landscape, portrait], settings)

    landscape_item, portrait_item = decoded
    assert landscape_item.processed_dimensions[0] == budget  # width was the long edge
    assert portrait_item.processed_dimensions[1] == budget  # height was the long edge


def test_no_module_level_state_retains_decoded_arrays(settings) -> None:
    payload = _png_bytes(200, 200)
    decode_and_downscale([payload, payload], settings)

    for value in vars(stitcher).values():
        assert not isinstance(value, np.ndarray)
