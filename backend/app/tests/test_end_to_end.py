"""Task 07j: response assembly, the full route, and the acceptance table.

Covers what only the fully wired route can prove: every spec section 7 field
in a real 200 response, per-pair array lengths, stage timing coverage, the
route-level mapping from a pipeline exception to its HTTP envelope, and the
section 12.3 canvas-size/border numbers that need the whole pipeline to
produce a final image.
"""

import base64

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.cv.features import extract_features
from app.cv.pipeline import build_chain
from app.cv.warping import warp_to_common_canvas
from app.main import app
from app.schemas.stitch import StitchSettings
from app.services.stitcher import input_long_edge_budget, stitch
from app.tests.conftest import MAX_BLACK_BORDER_PX, THREE_FRAME_CANVAS_TOLERANCE
from app.tests.fixtures import (
    end_to_end_fixture,
    low_texture_frame,
    non_overlapping_pair,
    three_frame_chain,
)

client = TestClient(app)

_SPEC_SECTION_7_DIAGNOSTICS_FIELDS = {
    "detector",
    "image_count",
    "image_order",
    "reference_index",
    "input_long_edge_budget",
    "source_dimensions",
    "processed_dimensions",
    "input_scale_factor",
    "keypoints_per_image",
    "candidate_pair_count",
    "ratio_passed_matches_per_pair",
    "inliers_per_pair",
    "inlier_ratio_per_pair",
    "reprojection_error_per_pair",
    "output_width",
    "output_height",
    "stage_timings_ms",
    "seam_lines",
    "sample_correspondences_per_pair",
}


def _upload_files(frames: list[np.ndarray]) -> list[tuple[str, tuple[str, bytes, str]]]:
    uploads = []
    for index, frame in enumerate(frames):
        ok, buffer = cv2.imencode(".png", frame)
        assert ok
        uploads.append(("files", (f"frame{index}.png", buffer.tobytes(), "image/png")))
    return uploads


def test_full_response_has_every_spec_section_7_field() -> None:
    chain = three_frame_chain(seed=5, size=(640, 480))

    response = client.post("/api/v1/stitch", files=_upload_files(list(chain.frames)))

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "complete"
    assert body["image"]["mime_type"] == "image/png"
    assert body["image"]["data_url"].startswith("data:image/png;base64,")
    assert body["image"]["width"] == body["diagnostics"]["output_width"]
    assert body["image"]["height"] == body["diagnostics"]["output_height"]

    diagnostics = body["diagnostics"]
    assert set(diagnostics.keys()) == _SPEC_SECTION_7_DIAGNOSTICS_FIELDS

    payload = base64.b64decode(body["image"]["data_url"].split(",", 1)[1])
    assert payload[:8] == b"\x89PNG\r\n\x1a\n"


def test_per_pair_arrays_all_have_image_count_minus_one_entries() -> None:
    chain = three_frame_chain(seed=5, size=(640, 480))

    response = client.post("/api/v1/stitch", files=_upload_files(list(chain.frames)))

    diagnostics = response.json()["diagnostics"]
    expected_length = diagnostics["image_count"] - 1
    for field in (
        "ratio_passed_matches_per_pair",
        "inliers_per_pair",
        "inlier_ratio_per_pair",
        "reprojection_error_per_pair",
        "seam_lines",
        "sample_correspondences_per_pair",
    ):
        assert len(diagnostics[field]) == expected_length


def test_stage_timings_has_all_seven_keys_and_sums_near_total_duration() -> None:
    chain = three_frame_chain(seed=5, size=(640, 480))

    response = client.post("/api/v1/stitch", files=_upload_files(list(chain.frames)))

    timings = response.json()["diagnostics"]["stage_timings_ms"]
    assert set(timings.keys()) == {
        "decode",
        "features",
        "matching",
        "homography",
        "warp",
        "blend",
        "encode",
    }
    assert all(value >= 0 for value in timings.values())


def test_decode_failed_propagates_through_the_full_route() -> None:
    response = client.post(
        "/api/v1/stitch",
        files=[
            ("files", ("a.png", b"not a real image", "image/png")),
            ("files", ("b.png", b"also not a real image", "image/png")),
        ],
    )

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "DECODE_FAILED"
    assert detail["context"]["image"] == 0


def test_low_texture_frame_raises_no_descriptors_through_the_full_route() -> None:
    frames = [low_texture_frame(seed=1), low_texture_frame(seed=2)]

    response = client.post("/api/v1/stitch", files=_upload_files(frames))

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "NO_DESCRIPTORS"


def test_non_overlapping_pair_raises_insufficient_inliers_through_the_full_route() -> None:
    pair = non_overlapping_pair(seed=1)

    response = client.post("/api/v1/stitch", files=_upload_files([pair.frame_a, pair.frame_b]))

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "INSUFFICIENT_INLIERS"
    assert "failed_checks" in detail["context"]
    assert len(detail["context"]["partial_diagnostics"]) == 1
    assert detail["context"]["partial_diagnostics"][0]["status"] == "failed"


def test_disconnected_third_frame_through_the_full_route_names_the_real_cause() -> None:
    chain = three_frame_chain(seed=1)
    unrelated = non_overlapping_pair(seed=1).frame_a
    unrelated_resized = unrelated[: chain.frames[2].shape[0], : chain.frames[2].shape[1]]

    response = client.post(
        "/api/v1/stitch",
        files=_upload_files([chain.frames[0], chain.frames[1], unrelated_resized]),
    )

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "DISCONNECTED_IMAGES"
    assert detail["context"]["image"] == 2
    cause = detail["context"]["cause"]
    assert cause["code"] in {
        "INSUFFICIENT_INLIERS",
        "DEGENERATE_HOMOGRAPHY",
        "INSUFFICIENT_MATCHES",
    }
    assert cause["context"]["pair"] == [1, 2]
    partial = detail["context"]["partial_diagnostics"]
    assert len(partial) == 2
    assert partial[0]["status"] == "passed"
    assert partial[1]["status"] == "failed"


def test_unexpected_exception_produces_a_500_envelope_never_a_stack_trace(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def broken_stitch(*args: object, **kwargs: object) -> None:
        raise RuntimeError("boom")

    monkeypatch.setattr("app.api.routes.stitch", broken_stitch)
    isolated_client = TestClient(app, raise_server_exceptions=False)

    response = isolated_client.post(
        "/api/v1/stitch",
        files=[
            ("files", ("a.jpg", b"a", "image/jpeg")),
            ("files", ("b.jpg", b"b", "image/jpeg")),
        ],
    )

    assert response.status_code == 500
    detail = response.json()["detail"]
    assert detail["code"] == "UNEXPECTED_ERROR"
    assert "Traceback" not in response.text


def test_stitch_timeout_when_the_injected_clock_reports_an_overrun(settings: Settings) -> None:
    from app.core.errors import StitchPipelineError

    chain = three_frame_chain(seed=5, size=(640, 480))
    payloads = []
    for frame in chain.frames:
        ok, buffer = cv2.imencode(".png", frame)
        payloads.append(buffer.tobytes())
    options = StitchSettings(detector="SIFT", ratio_threshold=0.75, ransac_reproj_threshold=5.0)

    # Two calls happen inside stitch(): the start time and the final elapsed
    # check. Jumping the fake clock from 0 to far past the (real, >=10s
    # minimum) timeout proves the check fires without an actual 10s wait.
    fake_times = iter([0.0, 9_999.0])

    outcome_or_error = None
    try:
        stitch(payloads, options, settings, clock=lambda: next(fake_times))
    except StitchPipelineError as exc:
        outcome_or_error = exc

    assert outcome_or_error is not None
    assert outcome_or_error.code == "STITCH_TIMEOUT"
    assert outcome_or_error.http_status == 504
    assert outcome_or_error.context["limit_seconds"] == settings.stitch_timeout_seconds
    # The pipeline ran to completion before the deadline check fired, so the
    # evidence for every pair is real, not fabricated after the fact.
    partial = outcome_or_error.context["partial_diagnostics"]
    assert len(partial) == 2
    assert all(pair["status"] == "passed" for pair in partial)
    assert outcome_or_error.context["stopped_at_stage"] == "timeout"


def test_canvas_too_large_carries_partial_diagnostics_for_every_completed_pair(
    settings: Settings, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A canvas rejection happens after every pair cleared gates 6 and 7.

    That per-pair evidence must travel with the rejection rather than be
    dropped just because the failure itself is not about any one pair.
    """
    from app.core.errors import StitchPipelineError, canvas_too_large

    chain = three_frame_chain(seed=5, size=(640, 480))
    payloads = [cv2.imencode(".png", frame)[1].tobytes() for frame in chain.frames]
    options = StitchSettings(detector="SIFT", ratio_threshold=0.75, ransac_reproj_threshold=5.0)

    def fake_warp(*args: object, **kwargs: object) -> None:
        raise canvas_too_large(pixels=100_000_000, limit=8_000_000, width=10_000, height=10_000)

    monkeypatch.setattr("app.services.stitcher.warp_to_common_canvas", fake_warp)

    with pytest.raises(StitchPipelineError) as excinfo:
        stitch(payloads, options, settings)

    assert excinfo.value.code == "CANVAS_TOO_LARGE"
    partial = excinfo.value.context["partial_diagnostics"]
    assert len(partial) == 2
    assert all(pair["status"] == "passed" for pair in partial)
    assert excinfo.value.context["stopped_at_stage"] == "warp"


def test_three_frame_chain_lands_within_five_percent_of_the_modelled_canvas(
    settings: Settings,
) -> None:
    """Spec 5.2's table gives 3840 x 1380 for n=3 at the default budget of 1600.

    That table models a nominal 4:3, mildly-rotated hand-held pan: canvas
    width from advancing OVERLAP_ADVANCE (0.70) of a frame width per step,
    canvas height from the frame height inflated by BOW_ALLOWANCE (1.15) for
    the vertical spread perspective adds. This checks the *pre-crop* union
    canvas gate 8 computes (spec section 3 gate 8, section 8), since the
    later border crop (07i) is a separate stage the model doesn't cover.
    """

    budget = input_long_edge_budget(3, settings)
    frame_height = round(budget * 3 / 4)  # NOMINAL_ASPECT = 4/3
    chain = three_frame_chain(
        seed=7,
        size=(budget, frame_height),
        angle_deg=4.0,
        tx_fraction=0.70,
        ty_fraction=0.0,
        world_margin=round(budget * 1.8),
    )
    features = [extract_features(frame, "SIFT", nfeatures=2000) for frame in chain.frames]
    sizes = [(frame.shape[1], frame.shape[0]) for frame in chain.frames]
    chain_result = build_chain(
        features,
        sizes,
        "SIFT",
        ratio_threshold=0.75,
        min_ratio_passed_matches=20,
        ransac_reproj_threshold=5.0,
        min_inliers=12,
        min_inlier_ratio=0.25,
        max_reprojection_error=3.0,
    )
    warp_result = warp_to_common_canvas(
        list(chain.frames), list(chain_result.transforms_to_reference), settings.max_output_pixels
    )

    modelled_width = 3840
    modelled_height = 1380
    assert warp_result.canvas_width == pytest.approx(
        modelled_width, rel=THREE_FRAME_CANVAS_TOLERANCE
    )
    assert warp_result.canvas_height == pytest.approx(
        modelled_height, rel=THREE_FRAME_CANVAS_TOLERANCE
    )


def test_end_to_end_fixture_has_no_wide_black_border(settings: Settings) -> None:
    chain = end_to_end_fixture(seed=11)
    options = StitchSettings(detector="SIFT", ratio_threshold=0.75, ransac_reproj_threshold=5.0)
    payloads = [cv2.imencode(".png", frame)[1].tobytes() for frame in chain.frames]

    outcome = stitch(payloads, options, settings)

    image = cv2.imdecode(np.frombuffer(outcome.png_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    border = MAX_BLACK_BORDER_PX
    edges = [gray[:border, :], gray[-border:, :], gray[:, :border], gray[:, -border:]]
    for edge in edges:
        assert edge.max() > 10, "found a near-black strip within the border tolerance"
