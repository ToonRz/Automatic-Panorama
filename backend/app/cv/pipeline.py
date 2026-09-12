"""Top-level multi-image pipeline boundary."""

from dataclasses import dataclass

import numpy as np

from app.schemas.stitch import StitchSettings


@dataclass(frozen=True)
class PipelineOutput:
    """Future encoded panorama and report data."""

    panorama: np.ndarray
    diagnostics: dict[str, object]


def stitch_images(images: list[np.ndarray], settings: StitchSettings) -> PipelineOutput:
    """Run the complete documented pipeline once all stage seams are ready."""

    del images, settings
    raise NotImplementedError("The complete panorama pipeline is not implemented yet.")
