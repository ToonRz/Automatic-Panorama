# Task 07a - fixtures and test harness

- Owner: Member E
- Reviewers: Member A, Member B
- Depends on: nothing, this lands first
- Spec: `docs/backend-spec.md` section 12

## Scope

Build the fixture module every other slice tests against. Synthetic fixtures
are generated in code from a numpy texture plane warped by a known homography,
so tests can assert distance from ground truth rather than absence of a crash.
Add one small real photograph set, downscaled, with its licence recorded.

Nothing in this slice imports from `backend/app/cv/` beyond type hints. It must
be mergeable while every stage is still a stub.

## Acceptance

Status: shipped with the pipeline in `06f90f5` directly on `main`, with no
pull request. Boxes checked on 2026-09-28 against `main` at `9ff021a` (CI run
36341167597: Ruff clean, 106 Pytest tests green). The build machine used for
this check has no OpenCV installed, so CI is the test evidence.

- [x] `backend/app/tests/fixtures.py` generates, from seeds, all seven
      synthetic cases listed in spec section 12.1 and returns the ground-truth
      homography alongside each pair;
      Evidence: `overlapping_pair`, `three_frame_chain`, `low_texture_frame`,
      `repeated_texture_pair`, `non_overlapping_pair`,
      `mixed_orientation_chain`, and `oversized_canvas_transforms`, all
      seeded; the pair and chain fixtures carry their known transforms.
- [ ] fixtures are deterministic: the same seed produces byte-identical arrays
      on a rerun;
      **Built, not tested.** `_textured_world` is seeded and its docstring
      claims byte-identical output, but no test compares two runs.
- [ ] no generated image is committed; the whole synthetic set is produced at
      test time in under two seconds;
      **Half verified.** No image is committed under `backend/app/tests/`.
      The two-second bound has not been measured on its own; the whole Pytest
      suite takes 9.8 s in CI.
- [ ] the one real end-to-end set is committed under 400 KB total, downscaled,
      with its source and licence recorded in `docs/demo-script.md`;
      **Not done.** `end_to_end_fixture` is a synthetic stand-in, as
      `docs/demo-script.md` records. The real photo sets now in the sample
      gallery are frontend demo assets, larger than 400 KB, with an unstated
      licence (`docs/demo-script.md`, "Demo image sources and licences").
- [x] `backend/app/tests/conftest.py` exposes every threshold in spec section
      12.3 as named constants, and no test hard-codes one;
      Evidence: `SIFT_MIN_INLIER_RATIO`, `SIFT_MAX_REPROJECTION_ERROR_PX`,
      `SIFT_MAX_CORNER_ERROR_PX`, `ORB_MIN_INLIER_RATIO`,
      `ORB_MAX_CORNER_ERROR_PX`, `THREE_FRAME_CANVAS_TOLERANCE`, and
      `MAX_BLACK_BORDER_PX`, imported by `test_homography.py` and
      `test_end_to_end.py`.
- [x] a helper renders a match/inlier visualization to a path a pull request
      can attach, and is never called during a CI assertion;
      Evidence: `fixtures.render_match_visualization`; no `test_*.py` calls
      it.
- [x] `make test` and `make lint` pass.
      Evidence: CI run 36341167597.
