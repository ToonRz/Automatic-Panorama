# Task 06 - overlay geometry in the diagnostics contract

Superseded. The overlay fields are part of the response contract rather than an
addition to it, and they are produced by the stages that already compute the
geometry.

- `seam_lines`: `task-plans/07h-canvas-and-warp.md`
- `sample_correspondences_per_pair`: `task-plans/07i-blend-crop-encode.md`
- schema and response plumbing: `task-plans/07j-response-assembly.md`

One field changed shape. `seam_positions_x` sent a single x per pair, which is
correct only under pure horizontal translation. It is replaced by `seam_lines`,
a two-point line per pair, because under real perspective the shared boundary
tilts and a vertical line would contradict the measurement the overlay exists
to illustrate. `docs/backend-spec.md` section 8 has the reasoning and the
shape; `docs/ui-spec.md` section 6.2 has the drawing rules.
