# Task 07c - decode, normalize, and the downscale budget

- Owner: Member C
- Reviewers: Member B, Member E
- Depends on: 07b
- Spec: `docs/backend-spec.md` sections 5.2, 5.3, 7.1

## Scope

Implement gate 4 in `services/stitcher.py`: decode uploaded bytes in memory,
enforce the decoded pixel ceiling, compute the per-request long-edge budget,
and resize every image into it. Produce the image manifest the diagnostics
carry: source dimensions, processed dimensions, and per-image scale factor.

This slice owns the budget formula. It is the reason eight frames are usable at
all, and the reason `CANVAS_TOO_LARGE` later means a broken alignment.

## Acceptance

Status: shipped with the pipeline in `06f90f5` directly on `main`, with no
pull request. Boxes checked on 2026-09-28 against `main` at `9ff021a` (CI run
36341167597: 106 Pytest tests green). Every test named below is in
`backend/app/tests/test_decode_and_downscale.py` unless stated.

- [x] `input_long_edge_budget(n)` reproduces the table in spec section 5.2
      exactly for every n from 2 to 8;
      Evidence: `test_input_long_edge_budget_matches_spec_table_exactly`.
- [x] resizing only ever shrinks; an image already inside the budget returns a
      scale factor of exactly 1.0;
      Evidence: `test_resizing_only_shrinks_and_in_budget_image_keeps_exact_scale_one`
      and `test_oversized_image_is_downscaled_and_never_upscaled`.
- [x] a decode failure raises `DECODE_FAILED` with the zero-based image index,
      including a file whose declared media type was valid;
      Evidence: `test_decode_failure_raises_decode_failed_with_zero_based_index`;
      `test_end_to_end.py::test_decode_failed_propagates_through_the_full_route`
      sends bytes declared `image/png` that are not an image.
- [x] an image over `max_image_pixels` raises `IMAGE_TOO_MANY_PIXELS` before it
      is resized;
      Evidence: `test_image_over_pixel_ceiling_raises_before_resize`.
- [x] the manifest carries `source_dimensions`, `processed_dimensions`, and
      `input_scale_factor`, one entry per image in upload order;
      Evidence: `test_manifest_preserves_upload_order_and_per_image_fields`.
- [x] portrait and landscape frames in one request each resize against their
      own long edge;
      Evidence: `test_portrait_and_landscape_frames_each_resize_against_their_own_long_edge`.
- [x] decoded arrays are request-scoped, and a test asserts no module-level
      state retains them after the call returns;
      Evidence: `test_no_module_level_state_retains_decoded_arrays`.
- [x] the decode stage records its own `stage_timings_ms` entry.
      Evidence: `services/stitcher.py` wraps decoding in
      `_StageTimer(stage_timings_ms, "decode")`;
      `test_end_to_end.py::test_stage_timings_has_all_seven_keys_and_sums_near_total_duration`.
