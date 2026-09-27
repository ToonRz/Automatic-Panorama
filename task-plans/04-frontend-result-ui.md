# Task 04 - upload and result UI

- Owner: Member D
- Reviewers: Member C, Member E
- Depends on: Task 03 contract

This task is a parent. The interface drawn in `docs/mockups/ui-mock.html` and
specified in `docs/ui-spec.md` is too large for one pull request, so it ships as
five slices. Each child below is its own owner and pull request. This file
tracks the whole and is closed only when every child is merged.

## Children

| Slice | File | Owner | Depends on |
| --- | --- | --- | --- |
| 04e test harness, fixtures, mock mode | `04e-ui-test-harness.md` | E | none, do this first |
| 04a design system and shell | `04a-ui-design-system.md` | D | 04e |
| 04b state machine and input rail | `04b-ui-state-and-input.md` | D | 04a, 04e |
| 04c result canvas and overlay | `04c-ui-result-canvas.md` | D | 04b, task 06 for the overlay fields |
| 04d diagnostics evidence | `04d-ui-diagnostics.md` | D | 04b |

`task-plans/06-overlay-diagnostics-contract.md` adds the two response fields
that 04c needs. 04c is not blocked by it: the overlay is built against the
fixture from 04e and degrades to a clean image when the fields are absent.

## Parent acceptance

Status: complete, then restyled by `task-plans/10-graphite-redesign.md`.
Boxes checked on 2026-09-28 against `main` at `9ff021a`.

- [x] all five children merged;
      Evidence: as commits directly on `main`, with no pull requests:
      04e `dffbc3e`, 04a `398fd3d`, 04b `5e77218`, 04c `c269d8d`,
      04d `2a19667`.
- [ ] every requirement in section 12 of `docs/ui-spec.md` is covered by a test
      or by a screenshot in a child pull request;
      **Partly.** A1-A9, A12, A15, and A17-A23 have Vitest cases (named in
      04b-04e, 10a-10e, and `docs/ui-spec.md` section 12). A10, A11, A13,
      A14, and A16 rest on browser checks that 10a-10e describe, and no
      child pull request exists to carry their screenshots.
- [x] the production build contains neither the state switcher nor the fixtures;
      Evidence: `src/test/build-exclusion.test.ts` (A12), run in CI.
- [x] `VITE_API_BASE_URL` still configures the public backend URL;
      Evidence: on 2026-09-28 the production bundle at
      `https://automatic-panorama.vercel.app` (`/assets/index-BsA0NQY2.js`)
      contained `https://automatic-panorama-api.onrender.com` and no
      state-switcher code, and that API answered CORS for the production
      origin (`docs/deployment-plan.md` section 10).
- [ ] the scaffold state is still present and honest while the API returns 501.
      **Superseded by 07j**: the API stopped returning 501 and the scaffold
      state was removed (`161c687`), as this item anticipated.
