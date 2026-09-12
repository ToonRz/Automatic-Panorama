# Task 04c - result canvas, overlay, and download

- Owner: Member D
- Reviewers: Member B, Member C
- Depends on: 04b; consumes the overlay fields owed by 07h and 07i
- Spec: `docs/ui-spec.md` sections 6.2, 6.3

## Scope

The complete state's image area: the panorama plate, the SVG seam and inlier
overlay, its toggle, and the download button. Built against the 04e fixtures, so
it does not wait for task 06 to merge.

Member B reviews because the overlay asserts things about geometry.

**Contract change.** The seam field is now `seam_lines`, one
`{ top: [x, y], bottom: [x, y] }` per pair, not `seam_positions_x`. A single x
is only correct under pure horizontal translation; a real seam tilts with
perspective, and a vertical line drawn where the seam is not contradicts the
measurement the overlay exists to show. `frontend/src/types.ts` and
`frontend/src/fixtures/` still carry the old name and are corrected here.
Reasoning: `docs/backend-spec.md` section 8.

## Acceptance

- [ ] the panorama renders from `image.data_url` with a descriptive alt text;
- [ ] `seam_positions_x` is gone from `frontend/src/types.ts`,
      `frontend/src/fixtures/`, and their tests, replaced by `seam_lines`;
- [ ] the overlay draws each seam as a line between its `top` and `bottom`
      points, and correspondence marks from `sample_correspondences_per_pair`,
      in output-image coordinates, with no coordinate arithmetic in the
      frontend;
- [ ] a fixture with a deliberately tilted seam renders a non-vertical line,
      proving the two points are both read;
- [ ] seam labels are anchored to the seam's top point so they follow a tilted
      seam, show the inlier count from `inliers_per_pair`, and the sampled
      points are never counted or presented as a measurement;
- [ ] the toggle flips visibility and `aria-pressed`, defaults to on, and is
      keyboard reachable;
- [ ] a response without the overlay fields renders the clean image with no
      toggle and no error;
- [ ] download always saves the clean image, under the filename in section 6.3,
      and the button label states the dimensions;
- [ ] tests cover both fixtures, the toggle, and the filename;
- [ ] screenshots with the overlay on and off.
