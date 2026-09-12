"""FastAPI application factory for the Automatic Panorama Stitcher."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.schemas.stitch import HealthResponse


def create_app() -> FastAPI:
    """Build the application so tests and Uvicorn use the same factory."""

    settings = get_settings()
    application = FastAPI(
        title="Automatic Panorama Stitcher API",
        description="CP461 scaffold for SIFT/ORB feature matching and panorama composition.",
        version="0.1.0",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
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
