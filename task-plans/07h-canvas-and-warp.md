# Task 07h - canvas bounds, perspective warp, and seam lines

- Owner: Member B
- Reviewers: Member A, Member C
- Depends on: 07g
- Spec: `docs/backend-spec.md` sections 3 gate 8, 8, 11

## Scope

Implement `cv/warping.py`. Project every image's corners into reference
coordinates, take the union bounding rectangle, translate the canvas so
coordinates are non-negative, and call `cv2.warpPerspective` for each image and
its validity mask. Also produce `seam_lines`, since the shared boundary between
a pair is a by-product of the projection this module already does.

`seam_lines` replaces the mock's single x per pair. A single x is correct only
under pure horizontal translation; under real perspective the shared boundary
tilts, and drawing a vertical line where the seam is not contradicts the
measurement the overlay exists to illustrate.

## Acceptance

Status: shipped with the pipeline in `06f90f5` directly on `main`, with no
pull request; seam placement for right-to-left pans was fixed in `af98260`.
Boxes checked on 2026-09-28 against `main` at `9ff021a` (CI run 36341167597:
106 Pytest tests green). Tests named below are in
`backend/app/tests/test_warping.py` unless stated.

- [x] the union canvas is computed from projected corners, not from a sum of
      widths, with a test on a deliberately rotated pair;
      Evidence: `test_canvas_bounds_come_from_projected_corners_not_summed_widths`.
- [x] a canvas exceeding `max_output_pixels` raises `CANVAS_TOO_LARGE` with
      `pixels`, `limit`, `width`, and `height`, and no image is returned;
      Evidence: `test_oversized_canvas_raises_canvas_too_large_and_returns_nothing`;
      `test_end_to_end.py::test_canvas_too_large_carries_partial_diagnostics_for_every_completed_pair`.
- [x] the canvas is never shrunk to fit the ceiling; rejection is the only
      response, per standing rule 01;
      Evidence: `cv/warping.py` has no resize or scale path; the only
      response to an oversized canvas is the error above.
- [x] the three-frame chain lands within 5 percent of the modelled canvas size
      in spec section 5.2;
      Evidence: `test_end_to_end.py::test_three_frame_chain_lands_within_five_percent_of_the_modelled_canvas`.
- [x] a validity mask is returned per image, and it is empty exactly where the
      warp wrote nothing;
      Evidence: `test_validity_mask_is_empty_exactly_where_the_warp_wrote_nothing`.
- [x] `seam_lines` has one entry per pair, each two points on the output
      canvas, and a rotated fixture produces a measurably non-vertical line;
      Evidence: `test_seam_lines_are_non_vertical_for_a_rotated_pair`, plus
      the four pan-direction seam tests added in `af98260`.
- [x] no blending or cropping happens in this module;
      Evidence: the `cv/warping.py` module docstring; blending and cropping
      live in `cv/blending.py`.
- [x] the warp stage records its own `stage_timings_ms` entry.
      Evidence: `_StageTimer(stage_timings_ms, "warp")` in
      `services/stitcher.py`.
