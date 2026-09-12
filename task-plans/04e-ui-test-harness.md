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

- [ ] `npm test` runs Vitest in the frontend and is wired into `make test`;
- [ ] the fixture set from section 10 exists in one module: a three-image success
      with overlay fields, a success without them, `INSUFFICIENT_INLIERS`,
      `IMAGE_TOO_LARGE`, an unrecognised code, and `PIPELINE_NOT_IMPLEMENTED`;
- [ ] fixtures are typed against `frontend/src/types.ts` so a contract change
      breaks the build rather than the demo;
- [ ] `VITE_MOCK_API` is off by default; when on, the client returns fixtures
      without touching the network;
- [ ] the state switcher renders only under the same flag and offers all seven
      states in section 4 of the spec;
- [ ] a test proves the production build excludes the switcher and the fixtures;
- [ ] one smoke test renders the existing app and passes, proving the harness
      works before any component is rewritten.
