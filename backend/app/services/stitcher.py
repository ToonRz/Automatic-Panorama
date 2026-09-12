"""Service boundary for the future multi-image stitching pipeline."""

from dataclasses import dataclass

import numpy as np

from app.schemas.stitch import StitchSettings


class PipelineNotImplementedError(RuntimeError):
    """Raised while the scaffold is waiting for the CV implementation."""


@dataclass(frozen=True)
class StitchResult:
    """Internal result shape that will later map to the public response."""

    image: np.ndarray
    diagnostics: dict[str, object]


class PanoramaStitcher:
    """Orchestrate decode -> features -> geometry -> warp -> blend."""

    def stitch(self, images: list[np.ndarray], options: StitchSettings) -> StitchResult:
        """Run the future pipeline; deliberately unimplemented in the scaffold."""

        del images, options
        raise PipelineNotImplementedError(
            "Implement the stages in app.cv before wiring the API success response."
        )
