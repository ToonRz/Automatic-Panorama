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

- [ ] `backend/app/tests/fixtures.py` generates, from seeds, all seven
      synthetic cases listed in spec section 12.1 and returns the ground-truth
      homography alongside each pair;
- [ ] fixtures are deterministic: the same seed produces byte-identical arrays
      on a rerun;
- [ ] no generated image is committed; the whole synthetic set is produced at
      test time in under two seconds;
- [ ] the one real end-to-end set is committed under 400 KB total, downscaled,
      with its source and licence recorded in `docs/demo-script.md`;
- [ ] `backend/app/tests/conftest.py` exposes every threshold in spec section
      12.3 as named constants, and no test hard-codes one;
- [ ] a helper renders a match/inlier visualization to a path a pull request
      can attach, and is never called during a CI assertion;
- [ ] `make test` and `make lint` pass.
