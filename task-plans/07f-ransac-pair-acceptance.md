# Task 07f - RANSAC and pair acceptance

- Owner: Member B
- Reviewers: Member A, Member E
- Depends on: 07e
- Spec: `docs/backend-spec.md` sections 3 gate 7, 7.3, 9, 12.3

## Scope

Implement `cv/homography.py` and gate 7. Estimate a homography with
`cv2.findHomography(..., cv2.RANSAC, ...)`, produce the inlier mask, compute
the reprojection error exactly as spec section 7.3 defines it, and reject a
pair on any of the four acceptance conditions.

This slice owns the definition of "this pair is good enough". Every number the
report argues from originates here.

## Acceptance

- [ ] reprojection error is the median symmetric transfer error over inliers
      only, matching the formula in spec section 7.3, with a unit test against
      a hand-computed value;
- [ ] `inlier_ratio` uses ratio-passed matches as its denominator, asserted;
- [ ] a pair is rejected when any of these holds: fewer than four
      correspondences, inliers below `min_inliers`, ratio below
      `min_inlier_ratio`, or error above `max_reprojection_error`;
- [ ] `DEGENERATE_HOMOGRAPHY` is raised with a `reason` of `non_finite`,
      `singular`, `non_convex_quad`, or `excessive_scale`, and each of the four
      has a test;
- [ ] the synthetic pair meets the SIFT and ORB bars in spec section 12.3,
      including corner error against the ground-truth homography;
- [ ] the non-overlapping fixture raises `INSUFFICIENT_INLIERS` and never
      returns a matrix;
- [ ] no warping, cropping, or blending happens in this module;
- [ ] the homography stage records its own `stage_timings_ms` entry.
