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

Status: shipped with the pipeline in `06f90f5` directly on `main`, with no
pull request; the rejection detail was extended in `0a18ebc`. Boxes checked
on 2026-09-28 against `main` at `9ff021a` (CI run 36341167597: 106 Pytest
tests green). Tests named below are in `backend/app/tests/test_homography.py`.

- [x] reprojection error is the median symmetric transfer error over inliers
      only, matching the formula in spec section 7.3, with a unit test against
      a hand-computed value;
      Evidence: `_symmetric_transfer_errors` and `np.median` in
      `cv/homography.py`; `test_reprojection_error_matches_hand_computed_value`.
- [x] `inlier_ratio` uses ratio-passed matches as its denominator, asserted;
      Evidence: `test_inlier_ratio_denominator_is_ratio_passed_matches`.
- [x] a pair is rejected when any of these holds: fewer than four
      correspondences, inliers below `min_inliers`, ratio below
      `min_inlier_ratio`, or error above `max_reprojection_error`;
      Evidence: `test_too_few_correspondences_raises_degenerate_homography_singular`,
      `test_low_inlier_count_reports_only_that_failed_check`,
      `test_low_inlier_ratio_reports_only_that_failed_check`, and
      `test_loose_fit_with_healthy_inliers_raises_excessive_reprojection_error`.
      Since `0a18ebc` a loose fit raises its own code,
      `EXCESSIVE_REPROJECTION_ERROR` (spec section 9).
- [x] `DEGENERATE_HOMOGRAPHY` is raised with a `reason` of `non_finite`,
      `singular`, `non_convex_quad`, or `excessive_scale`, and each of the four
      has a test;
      Evidence: `test_classify_degeneracy_covers_all_four_reasons` is
      parametrized over all four (plus a bow-tie quad), and
      `test_classify_degeneracy_accepts_a_healthy_matrix`.
- [x] the synthetic pair meets the SIFT and ORB bars in spec section 12.3,
      including corner error against the ground-truth homography;
      Evidence: `test_sift_pair_clears_the_spec_12_3_bar` and
      `test_orb_pair_clears_the_spec_12_3_bar`, against the `conftest.py`
      constants.
- [x] the non-overlapping fixture raises `INSUFFICIENT_INLIERS` and never
      returns a matrix;
      Evidence: `test_non_overlapping_pair_raises_insufficient_inliers_and_returns_no_matrix`.
- [x] no warping, cropping, or blending happens in this module;
      Evidence: `cv/homography.py` only estimates, scores, and classifies; its
      module docstring says so.
- [x] the homography stage records its own `stage_timings_ms` entry.
      Evidence: `cv/pipeline.py` accumulates `"homography"` across pairs.
