"""Thin HTTP routes for the panorama service."""

from typing import Annotated, cast

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.config import get_settings
from app.schemas.stitch import ClientConfig, DetectorName, StitchSettings

router = APIRouter()

_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
}


@router.get("/config", response_model=ClientConfig, tags=["config"])
def get_client_config() -> ClientConfig:
    """Expose safe defaults so the UI does not duplicate server policy."""

    settings = get_settings()
    return ClientConfig(
        max_upload_files=settings.max_upload_files,
        max_upload_mb=settings.max_upload_mb,
        default_detector=settings.default_detector,
        ratio_threshold=settings.ratio_threshold,
        ransac_reproj_threshold=settings.ransac_reproj_threshold,
    )


@router.post("/stitch", tags=["stitch"])
async def stitch_images(
    files: Annotated[list[UploadFile], File(description="Two or more overlapping images")],
    detector: Annotated[str, Form()] = "SIFT",
    ratio_threshold: Annotated[float | None, Form()] = None,
    ransac_reproj_threshold: Annotated[float | None, Form()] = None,
) -> None:
    """Validate the upload contract and reserve the future CV entry point.

    The actual pipeline is intentionally not wired in during scaffolding. The
    route still validates count, media type, settings, and per-file bytes so
    frontend and backend contributors can work against a real contract.
    """

    settings = get_settings()
    if len(files) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "TOO_FEW_IMAGES",
                "message": "Upload at least two overlapping images.",
            },
        )
    if len(files) > settings.max_upload_files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "TOO_MANY_IMAGES",
                "message": f"Upload no more than {settings.max_upload_files} images.",
            },
        )

    try:
        options = StitchSettings(
            detector=cast(DetectorName, detector.upper()),
            ratio_threshold=(
                settings.ratio_threshold if ratio_threshold is None else ratio_threshold
            ),
            ransac_reproj_threshold=(
                settings.ransac_reproj_threshold
                if ransac_reproj_threshold is None
                else ransac_reproj_threshold
            ),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INVALID_STITCH_SETTINGS",
                "message": "Detector and geometric thresholds are invalid.",
            },
        ) from exc

    for index, upload in enumerate(files):
        if upload.content_type not in _ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "UNSUPPORTED_IMAGE_TYPE",
                    "message": f"File {index + 1} is not a supported raster image.",
                },
            )
        contents = await upload.read(settings.max_upload_bytes + 1)
        if not contents:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "EMPTY_IMAGE",
                    "message": f"File {index + 1} is empty.",
                },
            )
        if len(contents) > settings.max_upload_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={
                    "code": "IMAGE_TOO_LARGE",
                    "message": (
                        f"File {index + 1} exceeds the {settings.max_upload_mb} MB limit."
                    ),
                },
            )

    # Keep the variable in scope until the implementation replaces this branch;
    # it proves that the route is already validating the future pipeline input.
    _ = options
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={
            "code": "PIPELINE_NOT_IMPLEMENTED",
            "message": "The CV pipeline is scaffolded but not implemented yet.",
        },
    )
