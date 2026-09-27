# Task 07i - blending, crop, encode, and sampled correspondences

- Owner: Member B
- Reviewers: Member A, Member E
- Depends on: 07h
- Spec: `docs/backend-spec.md` sections 3 gate 9, 7.4, 8, 11

## Scope

Implement `cv/blending.py`: feather the overlap between valid masks, compensate
simple exposure differences, crop empty borders, and encode PNG. Also project
the sampled inlier correspondences onto the output canvas for the overlay.

Feather blending is the committed strategy. Multiband is a later change and is
not started before the pairwise alignment in 07f is passing its bar.

## Acceptance

Status: shipped with the pipeline in `06f90f5` directly on `main`, with no
pull request. Boxes checked on 2026-09-28 against `main` at `9ff021a` (CI run
36341167597: 106 Pytest tests green). Tests named below are in
`backend/app/tests/test_blending.py` unless stated.

- [x] feather weights are computed from the valid masks and blended in float
      space before conversion back to 8-bit;
      Evidence: `test_feather_blend_mixes_the_overlap_in_float_space`.
- [x] no black border wider than 2 px remains on any edge of the real
      end-to-end fixture;
      Evidence: `test_end_to_end.py::test_end_to_end_fixture_has_no_wide_black_border`,
      against `MAX_BLACK_BORDER_PX`. The fixture is the synthetic stand-in
      (`task-plans/07a`), not a real photo set.
- [x] the border crop is derived from the combined valid mask, not from a fixed
      inset;
      Evidence: `test_crop_derives_from_the_combined_mask_not_a_fixed_inset`
      and `test_crop_never_includes_an_uncovered_corner`.
- [x] output is PNG only; no JPEG path is added;
      Evidence: the only encoder call in `cv/blending.py` is
      `cv2.imencode(".png", ...)`; `test_encode_png_round_trips_and_is_a_real_png`.
- [ ] a seam comparison image, feathered against a hard paste, is attached to
      the pull request;
      **Not recorded.** The slice had no pull request. The fixtures module's
      `render_match_visualization` can produce evidence images, but no seam
      comparison is recorded anywhere.
- [x] `sample_correspondences_per_pair` contains at most 12 entries per pair,
      in output-canvas coordinates, drawn from the inlier set;
      Evidence: `test_sample_correspondences_never_exceed_twelve_per_pair` and
      `test_sample_correspondences_subtracts_the_crop_offset`.
- [x] a docstring states that the sample is an illustration and its length is
      never a measurement;
      Evidence: `cv/blending.py`: "This is a drawn illustration for the
      overlay, never a measurement".
- [x] a deliberately misaligned fixture is not rescued by the blend; the
      misalignment stays visible, per standing rule 01;
      Evidence: `test_misaligned_overlap_is_not_hidden_by_the_blend`.
- [x] blend and encode each record their own `stage_timings_ms` entry.
      Evidence: `_StageTimer(stage_timings_ms, "blend")` and `"encode"` in
      `services/stitcher.py`.
