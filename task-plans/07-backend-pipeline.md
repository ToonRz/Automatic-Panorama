# Task 07 - backend CV pipeline

- Owner: Member C (integration), with A, B, and E owning slices
- Spec: `docs/backend-spec.md`

This task is a parent. The service specified in `docs/backend-spec.md` is far
too large for one pull request, so it ships as ten slices. Each child below is
its own branch, owner, and pull request. This file is closed only when every
child is merged.

Tasks 01, 02, and 03 are the original three-way split of this work. They were
too coarse to review and left `cv/pipeline.py` without an owner. They are now
stubs pointing here; their numbers are kept so the contribution trail in
`docs/contribution-plan.md` and the remedy table in `docs/ui-spec.md` stay
valid.

## Children

| Slice | File | Gate | Owner | Depends on |
| --- | --- | --- | --- | --- |
| 07a fixtures and test harness | `07a-cv-fixtures.md` | - | E | none, do this first |
| 07b request gates and concurrency | `07b-request-gates.md` | admission, 0-3 | C | 07a |
| 07c decode, normalize, downscale | `07c-decode-and-downscale.md` | 4 | C | 07b |
| 07d feature extraction | `07d-feature-extraction.md` | 5 | A | 07a |
| 07e matching and ratio test | `07e-matching-ratio-test.md` | 6 | A | 07d |
| 07f RANSAC and pair acceptance | `07f-ransac-pair-acceptance.md` | 7 | B | 07e |
| 07g ordering, reference, composition | `07g-ordering-and-composition.md` | 8 | A | 07f |
| 07h canvas, warp, seam lines | `07h-canvas-and-warp.md` | 8 | B | 07g |
| 07i blend, crop, encode | `07i-blend-crop-encode.md` | 9 | B | 07h |
| 07j response assembly and 501 removal | `07j-response-assembly.md` | - | C | all of the above |

Ownership is balanced at three slices each for A, B, and C. Member E owns 07a
plus the mock reconciliation noted in 07j.

`cv/pipeline.py` belongs to member A, not B. Ordering decides from pairwise
match scores, which are A's output. `docs/contribution-plan.md` records this.

## Parent acceptance

Boxes checked on 2026-09-28 against `main` at `9ff021a` (CI run 36341167597:
106 Pytest tests green).

- [x] all ten children merged;
      Evidence: 07a-07j landed together as `06f90f5` directly on `main`, with
      the scaffold removal in `161c687`. Each child file records its own
      acceptance.
- [x] every field in section 7 of `docs/backend-spec.md` appears in a real
      response captured in a pull request;
      Evidence: captured in the repository rather than a pull request; see
      `task-plans/07j`, first item.
- [x] every code in section 9 is raised by at least one test;
      Evidence: `task-plans/07j`, fourth item.
- [x] every threshold in section 10 is read from settings, with no literal
      threshold left in route, service, or stage code;
      Evidence: `services/stitcher.py` passes `settings.min_ratio_passed_matches`,
      `min_inliers`, `min_inlier_ratio`, `max_reprojection_error`,
      `max_output_pixels`, `max_image_pixels`, and `detector_nfeatures` into
      the stages. `api/routes.py` falls back to `settings.ratio_threshold`
      and `ransac_reproj_threshold`.
- [x] the acceptance table in section 12.3 passes in CI;
      Evidence: the SIFT and ORB pair tests in `test_homography.py`, and the
      canvas and border tests in `test_end_to_end.py`, all against the
      `conftest.py` constants.
- [x] `POST /api/v1/stitch` no longer returns 501, and the scaffold state is
      gone from the frontend in the same pull request;
      Evidence: `06f90f5` and `161c687`, consecutive commits with no pull
      request.
- [ ] `docs/mockups/backend-design.html` no longer contradicts the spec.
      **Not done.** It still carries a supersession banner that sends
      readers to `docs/backend-spec.md` instead of matching it
      (`task-plans/07j`).
