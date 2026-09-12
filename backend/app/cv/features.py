"""SIFT/ORB feature extraction seam."""

from dataclasses import dataclass
from typing import Any, Literal

import cv2
import numpy as np

DetectorName = Literal["SIFT", "ORB"]


@dataclass(frozen=True)
class FeatureSet:
    """Keypoints and descriptors for one normalized image."""

    keypoints: tuple[Any, ...]
    descriptors: np.ndarray | None
    detector: DetectorName


def create_detector(name: DetectorName, nfeatures: int = 2_000) -> Any:
    """Create the detector while keeping the algorithm choice in one place."""

    if name == "SIFT":
        return cv2.SIFT_create(nfeatures=nfeatures)  # type: ignore[attr-defined]
    return cv2.ORB_create(nfeatures=nfeatures)  # type: ignore[attr-defined]


def extract_features(
    image: np.ndarray,
    detector: DetectorName = "SIFT",
    nfeatures: int = 2_000,
) -> FeatureSet:
    """Extract grayscale features; shared interface for SIFT and ORB.

    This is the only feature-stage implementation in the scaffold. Matching,
    geometric estimation, multi-image composition, and blending remain pending.
    """

    if image.ndim == 3:
        grayscale = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        grayscale = image
    detector_instance: Any = create_detector(detector, nfeatures=nfeatures)
    keypoints, descriptors = detector_instance.detectAndCompute(grayscale, None)
    return FeatureSet(tuple(keypoints), descriptors, detector)
