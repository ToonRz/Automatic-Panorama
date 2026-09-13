"""FastAPI application factory for the Automatic Panorama Stitcher."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.core.config import get_settings
from app.core.errors import StitchPipelineError, total_upload_too_large
from app.schemas.stitch import HealthResponse

_STITCH_PATH = "/api/v1/stitch"


def _error_response(error: StitchPipelineError) -> JSONResponse:
    return JSONResponse(
        status_code=error.http_status,
        content={
            "detail": {
                "code": error.code,
                "message": error.message,
                "context": error.context or None,
            }
        },
    )


def create_app() -> FastAPI:
    """Build the application so tests and Uvicorn use the same factory."""

    settings = get_settings()
    application = FastAPI(
        title="Automatic Panorama Stitcher API",
        description="Feature-matching panorama stitching service.",
        version="1.0.0",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    @application.middleware("http")
    async def enforce_total_upload_limit(request: Request, call_next):  # type: ignore[no-untyped-def]
        """Gate 0: reject an oversized request from its Content-Length header alone.

        This runs before Starlette parses the multipart body at all, so an
        over-budget request is rejected before any file is fully read (spec
        section 5.1). A request with no Content-Length header (e.g. chunked
        transfer) falls through to the route's own per-file checks instead.
        """

        if request.method == "POST" and request.url.path == _STITCH_PATH:
            content_length = request.headers.get("content-length")
            if content_length is not None:
                try:
                    total_bytes = int(content_length)
                except ValueError:
                    total_bytes = None
                current_settings = get_settings()
                limit_bytes = current_settings.max_total_upload_bytes
                if total_bytes is not None and total_bytes > limit_bytes:
                    return _error_response(
                        total_upload_too_large(
                            total_bytes / (1024 * 1024), current_settings.max_total_upload_mb
                        )
                    )
        return await call_next(request)

    @application.exception_handler(StitchPipelineError)
    async def handle_stitch_pipeline_error(
        request: Request, exc: StitchPipelineError
    ) -> JSONResponse:
        del request
        return _error_response(exc)

    @application.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        del request, exc
        return JSONResponse(
            status_code=500,
            content={
                "detail": {
                    "code": "UNEXPECTED_ERROR",
                    "message": "An unexpected error occurred.",
                    "context": None,
                }
            },
        )

    @application.get("/healthz", response_model=HealthResponse, tags=["ops"])
    def healthz() -> HealthResponse:
        return HealthResponse(
            status="ok",
            service="automatic-panorama-api",
            environment=settings.app_env,
        )

    application.include_router(router, prefix="/api/v1")
    return application


app = create_app()
