"""Gate 5: feature extraction (task 07d)."""

import cv2
import numpy as np
import pytest

from app.core.errors import StitchPipelineError
from app.cv.features import extract_features
from app.tests.fixtures import low_texture_frame, overlapping_pair


def test_feature_interface_supports_sift_and_orb() -> None:
    pair = overlapping_pair(seed=1)

    sift_features = extract_features(pair.frame_a, "SIFT", nfeatures=2000)
    orb_features = extract_features(pair.frame_a, "ORB", nfeatures=2000)

    assert sift_features.detector == "SIFT"
    assert orb_features.detector == "ORB"
    assert sift_features.keypoint_count > 0
    assert orb_features.keypoint_count > 0


def test_sift_descriptors_are_float32_and_orb_are_uint8() -> None:
    pair = overlapping_pair(seed=1)

    sift_features = extract_features(pair.frame_a, "SIFT", nfeatures=2000)
    orb_features = extract_features(pair.frame_a, "ORB", nfeatures=2000)

    assert sift_features.descriptors is not None
    assert orb_features.descriptors is not None
    assert sift_features.descriptors.dtype == np.float32
    assert orb_features.descriptors.dtype == np.uint8


def test_low_texture_frame_raises_no_descriptors_for_sift_and_orb() -> None:
    frame = low_texture_frame(seed=1)

    for detector in ("SIFT", "ORB"):
        with pytest.raises(StitchPipelineError) as excinfo:
            extract_features(frame, detector, nfeatures=2000, image_index=2)
        assert excinfo.value.code == "NO_DESCRIPTORS"
        assert excinfo.value.context["image"] == 2
        assert excinfo.value.context["detector"] == detector


def test_grayscale_and_color_input_produce_the_same_keypoint_count() -> None:
    pair = overlapping_pair(seed=1)
    grayscale = cv2.cvtColor(pair.frame_a, cv2.COLOR_BGR2GRAY)

    color_features = extract_features(pair.frame_a, "SIFT", nfeatures=2000)
    grayscale_features = extract_features(grayscale, "SIFT", nfeatures=2000)

    assert color_features.keypoint_count == grayscale_features.keypoint_count
