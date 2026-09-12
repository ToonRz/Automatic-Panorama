"""Small deterministic checks for the implemented scaffold seams."""

import cv2
import numpy as np

from app.cv.features import extract_features
from app.cv.matching import ratio_test


def test_ratio_test_keeps_only_distinct_nearest_matches() -> None:
    accepted = cv2.DMatch(_queryIdx=0, _trainIdx=0, _imgIdx=0, _distance=1.0)
    runner_up = cv2.DMatch(_queryIdx=0, _trainIdx=1, _imgIdx=0, _distance=2.0)
    ambiguous = cv2.DMatch(_queryIdx=1, _trainIdx=0, _imgIdx=0, _distance=1.9)
    ambiguous_runner_up = cv2.DMatch(_queryIdx=1, _trainIdx=1, _imgIdx=0, _distance=2.0)

    matches = ratio_test([[accepted, runner_up], [ambiguous, ambiguous_runner_up]], 0.75)

    assert matches == [accepted]


def test_feature_interface_supports_sift_and_orb() -> None:
    image = np.zeros((240, 320, 3), dtype=np.uint8)
    cv2.rectangle(image, (35, 35), (285, 205), (255, 255, 255), 3)
    cv2.circle(image, (160, 120), 48, (150, 150, 150), 4)

    sift_features = extract_features(image, "SIFT")
    orb_features = extract_features(image, "ORB")

    assert sift_features.detector == "SIFT"
    assert orb_features.detector == "ORB"
    assert len(sift_features.keypoints) > 0
    assert len(orb_features.keypoints) > 0
