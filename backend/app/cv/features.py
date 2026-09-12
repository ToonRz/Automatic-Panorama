"""SIFT/ORB feature extraction seam.

Gate 5 lives here: an image that yields no descriptors, or too few for KNN
matching to even run, raises ``NO_DESCRIPTORS`` (spec section 3, section 9).
"""

from dataclasses import dataclass
from typing import Any, Literal

import cv2
import numpy as np

from app.core.errors import no_descriptors

DetectorName = Literal["SIFT", "ORB"]

# KNN matching (cv/matching.py) always asks for k=2 neighbours; an image with
# fewer than two descriptors cannot participate in that regardless of
# threshold tuning, so this is a structural floor, not a setting.
_MIN_DESCRIPTORS_FOR_MATCHING = 2


@dataclass(frozen=True)
class FeatureSet:
    """Keypoints and descriptors for one normalized image."""

    keypoints: tuple[cv2.KeyPoint, ...]
    descriptors: np.ndarray | None
    detector: DetectorName

    @property
    def keypoint_count(self) -> int:
        return len(self.keypoints)


def create_detector(name: DetectorName, nfeatures: int) -> Any:
    """Create the detector while keeping the algorithm choice in one place."""

    if name == "SIFT":
        return cv2.SIFT_create(nfeatures=nfeatures)  # type: ignore[attr-defined]
    return cv2.ORB_create(nfeatures=nfeatures)  # type: ignore[attr-defined]


def extract_features(
    image: np.ndarray,
    detector: DetectorName,
    nfeatures: int,
    image_index: int = 0,
) -> FeatureSet:
    """Extract grayscale features through one shared interface for SIFT and ORB.

    Raises ``StitchPipelineError`` (code ``NO_DESCRIPTORS``) when the image
    has too little texture to produce enough descriptors for matching.
    """

    if image.ndim == 3:
        grayscale = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        grayscale = image
    detector_instance: Any = create_detector(detector, nfeatures=nfeatures)
    keypoints, descriptors = detector_instance.detectAndCompute(grayscale, None)
    keypoints = tuple(keypoints)

    if descriptors is None or len(keypoints) < _MIN_DESCRIPTORS_FOR_MATCHING:
        raise no_descriptors(image_index, len(keypoints), detector)

    return FeatureSet(keypoints, descriptors, detector)
