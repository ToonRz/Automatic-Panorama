"""Environment-backed settings for the API and future CV pipeline."""

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
    max_image_pixels: int = Field(default=12_000_000, ge=100_000, le=50_000_000)
    default_detector: Literal["SIFT", "ORB"] = "SIFT"
    ratio_threshold: float = Field(default=0.75, gt=0, lt=1)
    ransac_reproj_threshold: float = Field(default=5.0, gt=0, le=50)
    min_inliers: int = Field(default=12, ge=4, le=500)
    min_inlier_ratio: float = Field(default=0.25, gt=0, le=1)
    max_output_pixels: int = Field(default=25_000_000, ge=100_000, le=100_000_000)

    @property
    def cors_origins(self) -> list[str]:
        """Return normalized CORS origins from a comma-separated setting."""

        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]

    @property
    def max_upload_bytes(self) -> int:
        """Return the per-file upload limit in bytes."""

        return self.max_upload_mb * 1024 * 1024


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Create settings once per process so routes share one configuration."""

    return Settings()
