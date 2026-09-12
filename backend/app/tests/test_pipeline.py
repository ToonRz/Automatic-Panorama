"""Gate 8 ordering, reference frame, and transform composition (task 07g)."""

import numpy as np
import pytest

from app.core.errors import StitchPipelineError
from app.cv.features import extract_features
from app.cv.pipeline import build_chain, reference_index_for
from app.tests.conftest import SIFT_MAX_CORNER_ERROR_PX, corner_error_px
from app.tests.fixtures import overlapping_pair, three_frame_chain


@pytest.mark.parametrize(("image_count", "expected"), [(2, 1), (3, 1), (8, 4)])
def test_reference_index_is_the_middle_frame(image_count: int, expected: int) -> None:
    assert reference_index_for(image_count) == expected


def _build(frames: list[np.ndarray], detector: str = "SIFT"):
    features = [extract_features(frame, detector, nfeatures=2000) for frame in frames]
    sizes = [(frame.shape[1], frame.shape[0]) for frame in frames]
    return build_chain(
        features,
        sizes,
        detector,
        ratio_threshold=0.75,
        min_ratio_passed_matches=20,
        ransac_reproj_threshold=5.0,
        min_inliers=12,
        min_inlier_ratio=0.25,
        max_reprojection_error=3.0,
    )


def test_image_order_is_identity_in_v1() -> None:
    chain = three_frame_chain(seed=1)
    result = _build(list(chain.frames))

    assert result.image_order == [0, 1, 2]
    assert result.reference_index == 1


def test_per_pair_arrays_have_image_count_minus_one_entries_in_order() -> None:
    chain = three_frame_chain(seed=1)
    result = _build(list(chain.frames))

    assert len(result.match_results) == len(chain.frames) - 1
    assert len(result.homography_results) == len(chain.frames) - 1
    # entry i describes the pair (image_order[i], image_order[i + 1])
    for i in range(len(result.homography_results)):
        assert result.image_order[i] == i
        assert result.image_order[i + 1] == i + 1


def test_three_frame_chain_composes_within_the_corner_error_bar() -> None:
    chain = three_frame_chain(seed=1)
    result = _build(list(chain.frames))

    # frame 0 -> reference(frame 1) should match the ground-truth h01 exactly.
    error_0 = corner_error_px(
        chain.frames[0].shape,
        chain.pairwise_homographies[0],
        result.transforms_to_reference[0],
    )
    assert error_0.max() <= SIFT_MAX_CORNER_ERROR_PX

    # frame 2 -> reference(frame 1) should match inv(h12).
    error_2 = corner_error_px(
        chain.frames[2].shape,
        np.linalg.inv(chain.pairwise_homographies[1]),
        result.transforms_to_reference[2],
    )
    assert error_2.max() <= SIFT_MAX_CORNER_ERROR_PX

    assert np.allclose(result.transforms_to_reference[1], np.eye(3))


def test_disconnected_frame_raises_disconnected_images_naming_it() -> None:
    chain = three_frame_chain(seed=1)
    unrelated = overlapping_pair(seed=777).frame_a
    unrelated_resized = unrelated[: chain.frames[2].shape[0], : chain.frames[2].shape[1]]

    with pytest.raises(StitchPipelineError) as excinfo:
        _build([chain.frames[0], chain.frames[1], unrelated_resized])

    assert excinfo.value.code == "DISCONNECTED_IMAGES"
    assert excinfo.value.context["image"] == 2


def test_two_image_rejection_surfaces_the_raw_gate_7_code() -> None:
    from app.tests.fixtures import non_overlapping_pair

    pair = non_overlapping_pair(seed=1)

    with pytest.raises(StitchPipelineError) as excinfo:
        _build([pair.frame_a, pair.frame_b])

    assert excinfo.value.code in {
        "INSUFFICIENT_INLIERS",
        "DEGENERATE_HOMOGRAPHY",
        "INSUFFICIENT_MATCHES",
    }
