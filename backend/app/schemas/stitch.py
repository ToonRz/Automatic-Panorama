"""Public API schemas for the scaffold and implemented pipeline."""

from typing import Any, Literal

from pydantic import BaseModel, Field

DetectorName = Literal["SIFT", "ORB"]


class HealthResponse(BaseModel):
    """Small liveness response used by local and hosted smoke tests."""

    status: Literal["ok"]
    service: str
    environment: str


class ClientConfig(BaseModel):
    """Safe, non-secret settings the UI may display or use as defaults.

    Exactly the nine fields spec section 6.2 names, each with a named
    consumer. A setting with no consumer is not published here.
    """

    max_upload_files: int
    max_upload_mb: int
    max_total_upload_mb: int
    default_detector: DetectorName
    ratio_threshold: float = Field(gt=0, lt=1)
    ransac_reproj_threshold: float = Field(gt=0)
    min_inliers: int
    min_inlier_ratio: float = Field(gt=0, le=1)
    max_input_long_edge_by_count: dict[str, int]


class StitchSettings(BaseModel):
    """Validated knobs shared by the frontend and future pipeline."""

    detector: DetectorName = "SIFT"
    ratio_threshold: float = Field(default=0.75, gt=0, lt=1)
    ransac_reproj_threshold: float = Field(default=5.0, gt=0, le=50)


class ErrorDetail(BaseModel):
    """Stable shape for actionable API failures.

    ``context`` widened from a flat scalar map to ``Any`` values (spec section
    9's "context carries the measurement that failed"): a pair rejection's
    ``partial_diagnostics`` is a list of per-pair objects and
    ``DISCONNECTED_IMAGES``' ``cause`` is a nested object, neither of which a
    flat scalar map can represent.
    """

    code: str
    message: str
    context: dict[str, Any] | None = None
