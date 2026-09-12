"""Environment-backed settings for the API and CV pipeline.

Every threshold in the system lives here, read from the environment once per
process (spec section 10). A magic number anywhere else in route, service, or
stage code is a review comment waiting to happen.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration with safe defaults for local development."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["development", "test", "production"] = "development"
    backend_cors_origins: str = "http://localhost:5173"

    max_upload_files: int = Field(default=8, ge=2, le=12)
    max_upload_mb: int = Field(default=12, ge=1, le=50)
    max_total_upload_mb: int = Field(default=48, ge=4, le=200)
    max_image_pixels: int = Field(default=12_000_000, ge=100_000, le=50_000_000)
    max_output_pixels: int = Field(default=8_000_000, ge=100_000, le=40_000_000)
    canvas_budget_fraction: float = Field(default=0.75, ge=0.25, le=1.0)
    input_long_edge_cap: int = Field(default=1_600, ge=480, le=4_096)
    input_long_edge_floor: int = Field(default=640, ge=240, le=1_600)

    default_detector: Literal["SIFT", "ORB"] = "SIFT"
    detector_nfeatures: int = Field(default=2_000, ge=200, le=20_000)

    ratio_threshold: float = Field(default=0.75, gt=0, lt=1)
    min_ratio_passed_matches: int = Field(default=20, ge=8, le=500)

    ransac_reproj_threshold: float = Field(default=5.0, gt=0, le=50)
    min_inliers: int = Field(default=12, ge=4, le=500)
    min_inlier_ratio: float = Field(default=0.25, gt=0, le=1)
    max_reprojection_error: float = Field(default=3.0, ge=0.5, le=20)

    stitch_timeout_seconds: int = Field(default=60, ge=10, le=300)
    max_concurrent_stitches: int = Field(default=1, ge=1, le=4)

    @property
    def cors_origins(self) -> list[str]:
        """Return normalized CORS origins from a comma-separated setting."""

        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]

    @property
    def max_upload_bytes(self) -> int:
        """Return the per-file upload limit in bytes."""

        return self.max_upload_mb * 1024 * 1024

    @property
    def max_total_upload_bytes(self) -> int:
        """Return the whole-request upload limit in bytes."""

        return self.max_total_upload_mb * 1024 * 1024


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Create settings once per process so routes share one configuration."""

    return Settings()
