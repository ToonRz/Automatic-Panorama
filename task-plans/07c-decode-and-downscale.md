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

- [ ] `input_long_edge_budget(n)` reproduces the table in spec section 5.2
      exactly for every n from 2 to 8;
- [ ] resizing only ever shrinks; an image already inside the budget returns a
      scale factor of exactly 1.0;
- [ ] a decode failure raises `DECODE_FAILED` with the zero-based image index,
      including a file whose declared media type was valid;
- [ ] an image over `max_image_pixels` raises `IMAGE_TOO_MANY_PIXELS` before it
      is resized;
- [ ] the manifest carries `source_dimensions`, `processed_dimensions`, and
      `input_scale_factor`, one entry per image in upload order;
- [ ] portrait and landscape frames in one request each resize against their
      own long edge;
- [ ] decoded arrays are request-scoped, and a test asserts no module-level
      state retains them after the call returns;
- [ ] the decode stage records its own `stage_timings_ms` entry.
