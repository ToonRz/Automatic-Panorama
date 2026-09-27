# Task 04e - UI test harness, fixtures, and mock mode

- Owner: Member E
- Reviewers: Member D, Member C
- Depends on: scaffold
- Spec: `docs/ui-spec.md` section 10

The fixtures written in this slice use `seam_positions_x`, which the backend
contract has since replaced with `seam_lines`. `task-plans/04c` corrects the
fixtures, the types, and their tests; see `docs/backend-spec.md` section 8 for
why the shape changed.

Do this slice before the other four. Every later slice asserts against these
fixtures, and the complete and failed states cannot be seen at all until mock
mode exists, because the live API returns 501.

## Scope

Add Vitest and React Testing Library to the frontend, wire a `test` script, and
build the fixture set and the mock branch inside the API client. Add the
development-only state switcher. No product UI is changed in this slice.

## Acceptance

Status: complete. Landed as `dffbc3e` directly on `main`; boxes checked on
2026-09-28 against `main` at `9ff021a` (CI run 36341167597: 229 Vitest tests
green).

- [x] `npm test` runs Vitest in the frontend and is wired into `make test`;
      Evidence: `frontend/package.json` `"test": "vitest run"`; the
      `Makefile` `test` target runs `cd frontend && npm test`; CI's frontend
      job runs it too (`task-plans/05`).
- [x] the fixture set from section 10 exists in one module: a three-image success
      with overlay fields, a success without them, `INSUFFICIENT_INLIERS`,
      `IMAGE_TOO_LARGE`, an unrecognised code, and `PIPELINE_NOT_IMPLEMENTED`;
      Evidence: `frontend/src/fixtures/index.ts` exports
      `successWithOverlayFixture` (the three-image contract snapshot),
      `successWithoutOverlayFixture`, `insufficientInliersError`,
      `imageTooLargeError`, and `unrecognizedCodeError`.
      `PIPELINE_NOT_IMPLEMENTED` was removed with the scaffold state in
      `task-plans/07j`, as intended.
- [x] fixtures are typed against `frontend/src/types.ts` so a contract change
      breaks the build rather than the demo;
      Evidence: hand-written fixtures are annotated `StitchResponse` or
      `MockErrorFixture`. The success snapshot is JSON cast to
      `StitchResponse`, so for that one a contract change fails
      `fixtures/contract.test.tsx` and the backend's
      `test_committed_snapshots_match_live_response_shapes` rather than
      `tsc`.
- [x] `VITE_MOCK_API` is off by default; when on, the client returns fixtures
      without touching the network;
      Evidence: `api.ts` checks `import.meta.env.VITE_MOCK_API === "true"`;
      `api.test.ts` › "returns the overlay success fixture without touching
      the network" and the four sibling fixture cases.
- [x] the state switcher renders only under the same flag and offers all seven
      states in section 4 of the spec;
      Evidence: `App.tsx` renders `StateSwitcher` only when `mockApiEnabled`;
      `StateSwitcher.test.tsx` › "renders a button for every state in section
      4, plus the cold-start variant"; `App.mock.test.tsx`.
- [x] a test proves the production build excludes the switcher and the fixtures;
      Evidence: `src/test/build-exclusion.test.ts` › "excludes the mock state
      switcher and fixtures when VITE_MOCK_API is unset" (A12).
- [x] one smoke test renders the existing app and passes, proving the harness
      works before any component is rewritten.
      Evidence: `App.smoke.test.tsx` › "renders without crashing, proving the
      test harness works".
