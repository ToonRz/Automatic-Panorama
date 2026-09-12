# Task 04 - upload and result UI

- Owner: Member D
- Reviewers: Member C, Member E
- Branch: `feature/04-upload-result-ui`
- Depends on: Task 03 contract

This task is a parent. The interface drawn in `docs/mockups/ui-mock.html` and
specified in `docs/ui-spec.md` is too large for one pull request, so it ships as
five slices. Each child below is its own branch, owner, and pull request. This
file tracks the whole and is closed only when every child is merged.

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

- [ ] all five children merged;
- [ ] every requirement in section 12 of `docs/ui-spec.md` is covered by a test
      or by a screenshot in a child pull request;
- [ ] the production build contains neither the state switcher nor the fixtures;
- [ ] `VITE_API_BASE_URL` still configures the public backend URL;
- [ ] the scaffold state is still present and honest while the API returns 501.
