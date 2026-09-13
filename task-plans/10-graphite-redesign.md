# Task 10 - Graphite visual redesign

- Owner: TBD (frontend)
- Reviewers: TBD
- Spec: `docs/ui-spec.md` sections 2, 3, 3.1, 5, 6.4, 7, 11, 12 (A10, A13-A17)
- Visual reference: `docs/mockups/ui-mock-v2.html`

## Why

The shipped screen is a narrow column in the middle of a wide window, the
control rail and the output panel end at different heights, the page looks
empty before the first run, and the serif display face reads dated next to a
technical tool. The v2 mock recomposes the page and was drawn in three
palettes; Graphite was chosen on 2026-09-13.

## Boundaries

This task is a parent. Each child is its own pull request from a
`feature/10x-...` branch into `develop`. This file is closed only when every
child is merged.

The redesign changes presentation and layout. It does not change the state
machine in `useStitchRun`, the API client, the contract fixtures, remedy
wording, overlay geometry, or any backend field. The only behavioural changes
are the four the spec now records:

1. the detector `<select>` becomes a radio group (section 3.1, A17);
2. the diagnostics band renders a no-number frame before a result (section
   6.4, A15);
3. the working-state stage checklist moves into the stage ribbon under the
   viewport (section 5);
4. the hero block and footer fold into a sticky top bar (section 3).

Out of scope: a light theme or theme switcher; a keyboard shortcut for the
primary action (an early v2 draft showed one and it was dropped);
drag-to-reorder; new API fields.

## Children

| Order | Slice | File | Owner | Depends on |
| --- | --- | --- | --- | --- |
| 1 | 10a Graphite tokens and fonts | `10a-graphite-tokens-and-fonts.md` | TBD | none |
| 2 | 10b app shell and layout | `10b-app-shell-and-layout.md` | TBD | 10a |
| 3 | 10c control rail | `10c-control-rail.md` | TBD | 10b |
| 4 | 10d output stage | `10d-output-stage.md` | TBD | 10b |
| 5 | 10e diagnostics band | `10e-diagnostics-band.md` | TBD | 10b, 10d |

10c and 10d may run in parallel after 10b. 10e waits for 10d because 10d moves
the detector/frames/order chips out of the diagnostics heading and into the
stage head; merging 10e first would drop them from the screen.

`frontend/src/styles.css` is shared by every child. 10a splits it into
comment-delimited blocks (tokens and base, shell, rail, stage, diagnostics),
and each child edits only its own block, so parallel slices do not conflict.

## Parent acceptance

- [ ] all five children merged into `develop`;
- [ ] `docs/ui-spec.md` A1-A17 pass, and A10 and A13-A17 each have a test or
      recorded browser evidence linked from the slice that closed them;
- [ ] the last child's pull request carries screenshots of all seven mock-mode
      states (`Empty`, `Frames loaded`, `Preparing`, `Stitching`,
      `Stitching (cold start)`, `Complete`, `Rejected`) at 1440px, plus
      `Complete` and `Rejected` at 960px and 375px;
- [ ] `make test`, `make lint`, and `make frontend-build` are green;
- [ ] the copy guard (`frontend/src/copyGuard.test.tsx`) passes unchanged.
