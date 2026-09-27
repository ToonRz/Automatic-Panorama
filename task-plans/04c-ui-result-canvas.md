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

Status: shipped as `c269d8d` directly on `main`, with no pull request. Boxes
checked on 2026-09-28 against `main` at `9ff021a` (CI run 36341167597 green).

- [x] the panorama renders from `image.data_url` with a descriptive alt text;
      Evidence: `ResultPlate.test.tsx` › "renders the panorama from
      image.data_url with a descriptive alt".
- [x] `seam_positions_x` is gone from `frontend/src/types.ts`,
      `frontend/src/fixtures/`, and their tests, replaced by `seam_lines`;
      Evidence: no occurrence of `seam_positions_x` remains under
      `frontend/src/`.
- [x] the overlay draws each seam as a line between its `top` and `bottom`
      points, and correspondence marks from `sample_correspondences_per_pair`,
      in output-image coordinates, with no coordinate arithmetic in the
      frontend;
      Evidence: `Overlay.tsx` draws `<line x1={seam.top[0]} … x2={seam.bottom[0]}>`
      and each sample's `from`/`to` points as given. The only arithmetic is
      label placement (below), not geometry.
- [ ] a fixture with a deliberately tilted seam renders a non-vertical line,
      proving the two points are both read;
      **Partly.** The fixture is tilted (`fixtures/index.test.ts` › "gives
      every seam two distinct endpoints, at least one of them tilted"), and
      `Overlay.tsx` reads both points, but no test asserts that the rendered
      line's `x1` and `x2` differ.
- [x] seam labels are anchored to the seam's top point so they follow a tilted
      seam, show the inlier count from `inliers_per_pair`, and the sampled
      points are never counted or presented as a measurement;
      Evidence: `ResultPlate.test.tsx` expects "SEAM 01 · 457 inliers" from
      `inliers_per_pair`; `Overlay.test.tsx` covers placement. Since `b9eaa59`
      a label follows its seam's top point horizontally and drops to the
      next free line when it would overprint a neighbour
      (`docs/ui-spec.md` section 6.2).
- [x] the toggle flips visibility and `aria-pressed`, defaults to on, and is
      keyboard reachable;
      Evidence: `OutputCanvas.test.tsx` › "shows the overlay toggle in the
      head, defaulting on, and flips aria-pressed and overlay visibility"; it
      is a native `<button>` (A5, A11).
- [x] a response without the overlay fields renders the clean image with no
      toggle and no error;
      Evidence: `OutputCanvas.test.tsx` › "omits the toggle and its divider
      when the overlay fields are absent, with no error";
      `ResultPlate.test.tsx` › "renders no overlay when the fields are
      absent…".
- [x] download always saves the clean image, under the filename in section 6.3,
      and the button label states the dimensions;
      Evidence: `OutputCanvas.test.tsx` › "downloads the clean image under
      the lowercased section 6.3 filename (A6)" and "names the download
      button with the output dimensions…".
- [x] tests cover both fixtures, the toggle, and the filename;
      Evidence: the `ResultPlate.test.tsx` and `OutputCanvas.test.tsx` cases
      above use `successWithOverlayFixture` and
      `successWithoutOverlayFixture`.
- [ ] screenshots with the overlay on and off.
      **Not recorded.** The slice had no pull request to carry them.
