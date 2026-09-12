"""Canvas bounds and perspective-warp seam."""

import numpy as np


def compose_transforms(transforms: list[np.ndarray]) -> np.ndarray:
    """Compose pairwise transforms into the selected reference frame."""

    del transforms
    raise NotImplementedError("Multi-image transform composition is not implemented yet.")


def warp_to_common_canvas(
    images: list[np.ndarray],
    transforms: list[np.ndarray],
    max_output_pixels: int,
) -> tuple[list[np.ndarray], list[np.ndarray]]:
    """Warp images and validity masks after computing the union canvas."""

    del images, transforms, max_output_pixels
    raise NotImplementedError("Perspective warping is not implemented yet.")
