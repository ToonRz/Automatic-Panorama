# Task 08a - user-facing copy cleanup

- Owner: TBD
- Reviewers: TBD
- Depends on: 08f
- Spec: `docs/integration-spec.md` sections 3, 1.2, 2 (G1, G2)

## Scope

Remove course, report, and hosting-provider text from every surface a user can
reach, using the replacement table in spec section 3.2. Add the copy guard test.
Correct the repository documents that still describe a scaffold or a 501.

Code comments and team documents (`assignment-alignment.md`,
`contribution-plan.md`, `demo-script.md`) are not changed.

## Files

- `frontend/src/App.tsx`, `frontend/index.html`
- `frontend/src/components/OutputCanvas/EmptyState.tsx`,
  `WorkingState.tsx`
- `frontend/src/components/Diagnostics/Diagnostics.tsx`
- `frontend/src/components/StatusPill.tsx`
- `frontend/src/components/ControlRail/ControlRail.tsx`
- `frontend/src/constants/remedies.ts` (generic remedy only)
- `frontend/src/copyGuard.test.tsx` - new
- `backend/app/main.py`, `backend/app/tests/test_health.py`
- `README.md`, `CLAUDE.md` ("Project" paragraph and document map),
  `docs/architecture.md`, `docs/deployment-plan.md`,
  `docs/backend-spec.md` sections 1.1 and 9, `docs/ui-spec.md` section 9

## Acceptance

- [x] every row in spec section 3.2 is applied;
- [x] the copy guard renders all screen states and fails on the pattern in spec
      section 3.3; it is shown failing on the old copy in the pull request;
- [x] a backend test asserts the OpenAPI title and description match none of
      the guarded terms;
- [x] `README.md` status block and local workflow describe a working stitcher;
- [x] `CLAUDE.md` no longer says the repository is a scaffold or that the stitch
      route is unimplemented, and its document map lists
      `docs/integration-spec.md`;
- [x] `PIPELINE_NOT_IMPLEMENTED` appears in no document except the removed-state
      note in `docs/ui-spec.md` section 8;
- [x] screenshots of the header, empty state, working state with the cold-start
      note, status pill in each state, and footer.
