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

- [ ] the union canvas is computed from projected corners, not from a sum of
      widths, with a test on a deliberately rotated pair;
- [ ] a canvas exceeding `max_output_pixels` raises `CANVAS_TOO_LARGE` with
      `pixels`, `limit`, `width`, and `height`, and no image is returned;
- [ ] the canvas is never shrunk to fit the ceiling; rejection is the only
      response, per standing rule 01;
- [ ] the three-frame chain lands within 5 percent of the modelled canvas size
      in spec section 5.2;
- [ ] a validity mask is returned per image, and it is empty exactly where the
      warp wrote nothing;
- [ ] `seam_lines` has one entry per pair, each two points on the output
      canvas, and a rotated fixture produces a measurably non-vertical line;
- [ ] no blending or cropping happens in this module;
- [ ] the warp stage records its own `stage_timings_ms` entry.
