"""Thin HTTP routes for the panorama service.

Admission and gates 0-3 are validated here (byte limits, counts, media
types, settings parsing); gates 4-9 run inside `services/stitcher.py`. This
module never imports `cv2` or touches pixel data (spec section 2's layer
contract) -- it reads bytes off each `UploadFile` and hands them to the
service as-is.
"""

import base64
from typing import Annotated, cast

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.core.errors import (
    empty_image,
    image_too_large,
    invalid_stitch_settings,
    too_few_images,
    too_many_images,
    unsupported_image_type,
)
from app.schemas.stitch import ClientConfig, DetectorName, StitchSettings
from app.services.stitcher import StitchOutcome, StitchSlot, input_long_edge_budget, stitch

router = APIRouter()

_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
}


@router.get("/config", response_model=ClientConfig, tags=["config"])
def get_client_config(settings: Annotated[Settings, Depends(get_settings)]) -> ClientConfig:
    """Expose safe defaults so the UI does not duplicate server policy (spec 6.2)."""

    budget_table = {
        str(count): input_long_edge_budget(count, settings)
        for count in range(2, max(2, settings.max_upload_files) + 1)
    }
    return ClientConfig(
        max_upload_files=settings.max_upload_files,
        max_upload_mb=settings.max_upload_mb,
        max_total_upload_mb=settings.max_total_upload_mb,
        default_detector=settings.default_detector,
        ratio_threshold=settings.ratio_threshold,
        ransac_reproj_threshold=settings.ransac_reproj_threshold,
        min_inliers=settings.min_inliers,
        min_inlier_ratio=settings.min_inlier_ratio,
        max_input_long_edge_by_count=budget_table,
    )


def _parse_settings(
    detector: str,
    ratio_threshold: float | None,
    ransac_reproj_threshold: float | None,
    settings: Settings,
) -> StitchSettings:
    """Gate 3: validate detector and geometric thresholds, falling back to server defaults."""

    try:
        return StitchSettings(
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
    except ValidationError as exc:
        first_error = exc.errors()[0]
        field = ".".join(str(part) for part in first_error["loc"])
        raise invalid_stitch_settings(field, first_error.get("input")) from exc


def _read_and_validate_files(
    files: list[UploadFile],
    settings: Settings,
) -> list[bytes]:
    """Gate 2: media type, non-empty, per-file bytes."""

    payloads: list[bytes] = []
    for index, upload in enumerate(files):
        if upload.content_type not in _ALLOWED_CONTENT_TYPES:
            raise unsupported_image_type(index, upload.content_type)

        contents = upload.file.read()
        if not contents:
            raise empty_image(index)
        if len(contents) > settings.max_upload_bytes:
            raise image_too_large(index, len(contents) / (1024 * 1024), settings.max_upload_mb)

        payloads.append(contents)
    return payloads


def _serialize_success(outcome: StitchOutcome, options: StitchSettings) -> dict[str, object]:
    del options  # the detector choice is already inside outcome.diagnostics
    encoded = base64.b64encode(outcome.png_bytes).decode("ascii")
    return {
        "status": "complete",
        "image": {
            "data_url": f"data:image/png;base64,{encoded}",
            "mime_type": "image/png",
            "width": outcome.width,
            "height": outcome.height,
        },
        "diagnostics": outcome.diagnostics,
    }


@router.post("/stitch", tags=["stitch"])
def stitch_images(
    files: Annotated[list[UploadFile], File(description="Two or more overlapping images")],
    settings: Annotated[Settings, Depends(get_settings)],
    detector: Annotated[str, Form()] = "SIFT",
    ratio_threshold: Annotated[float | None, Form()] = None,
    ransac_reproj_threshold: Annotated[float | None, Form()] = None,
) -> dict[str, object]:
    """Validate the upload (gates 1-3), then run the pipeline (gates 4-9).

    A plain ``def``: FastAPI dispatches this to the threadpool, so a
    blocking ``cv2`` call here never stalls the event loop that answers
    ``/healthz`` (spec section 4). Gate 0 (total request bytes) is enforced
    earlier, in ``app.main``'s middleware, from the ``Content-Length``
    header alone -- before Starlette parses this multipart body at all.
    """

    if len(files) < 2:
        raise too_few_images(len(files))
    if len(files) > settings.max_upload_files:
        raise too_many_images(len(files), settings.max_upload_files)

    options = _parse_settings(detector, ratio_threshold, ransac_reproj_threshold, settings)
    file_payloads = _read_and_validate_files(files, settings)

    with StitchSlot(settings):
        outcome = stitch(file_payloads, options, settings)

    return _serialize_success(outcome, options)
