# Task 04c - result canvas, overlay, and download

- Owner: Member D
- Reviewers: Member B, Member C
- Depends on: 04b; consumes the fields added by task 06
- Spec: `docs/ui-spec.md` sections 6.2, 6.3

## Scope

The complete state's image area: the panorama plate, the SVG seam and inlier
overlay, its toggle, and the download button. Built against the 04e fixtures, so
it does not wait for task 06 to merge.

Member B reviews because the overlay asserts things about geometry.

## Acceptance

- [ ] the panorama renders from `image.data_url` with a descriptive alt text;
- [ ] the overlay draws seam lines from `seam_positions_x` and correspondence
      marks from `sample_correspondences_per_pair`, in output-image coordinates,
      with no coordinate arithmetic in the frontend;
- [ ] seam labels show the inlier count from `inliers_per_pair`, and the sampled
      points are never counted or presented as a measurement;
- [ ] the toggle flips visibility and `aria-pressed`, defaults to on, and is
      keyboard reachable;
- [ ] a response without the overlay fields renders the clean image with no
      toggle and no error;
- [ ] download always saves the clean image, under the filename in section 6.3,
      and the button label states the dimensions;
- [ ] tests cover both fixtures, the toggle, and the filename;
- [ ] screenshots with the overlay on and off.
