# Task 10b - app shell and layout

- Owner: TBD
- Reviewers: TBD
- Depends on: 10a
- Spec: `docs/ui-spec.md` section 3, section 9 (pill labels), A10, A12, A13
- Parent: `task-plans/10-graphite-redesign.md`

## Scope

Recompose the page frame so the workspace uses the window and the two main
panels always share a height. Region contents are restyled by 10c-10e; this
slice owns the frame they sit in and the shared panel primitive.

- Replace `.sheet`, `.hero`, and `.appfoot` with:
  - a sticky 60px top bar: brand mark, product name
    "Automatic Panorama Stitcher", method line
    "SIFT / ORB · RANSAC · warp · blend", privacy line
    "Processed in memory · never stored" with a lock icon, and the status
    pill;
  - a page head: h1 "Stitch overlapping photos into one panorama" and the
    lede "Upload {min}–{max} frames in capture order. Every seam comes with
    the evidence behind it.", with `{min}` from `MIN_FILES` and `{max}` from
    `config.max_upload_files`;
  - the workspace grid (`384px` rail, fluid stage, 16px gap,
    `align-items: stretch`);
  - the diagnostics band slot underneath. `App` still renders
    `Diagnostics` only when a result exists; 10e changes that.
- Add a shared `PanelHead` component: index badge, title, optional aside,
  optional trailing children. 10c-10e use it instead of the `kicker` + `h2`
  pair.
- Restyle `StatusPill` per the section 2 colour rule: `checking` and `waking`
  in `--run`, `online` in `--pass`, `offline` in `--fail`. Labels unchanged.
- Restyle the mock-mode `StateSwitcher` as a floating bar at the bottom of the
  viewport. It stays dev-only.
- Implement the 1180px, 960px, and 600px breakpoints for the frame itself:
  shell max width and padding, top bar hide rules, single-column workspace at
  960px with the rail first.

## Files

- `frontend/src/App.tsx`
- `frontend/src/components/PanelHead.tsx` - new, plus test
- `frontend/src/components/StatusPill.tsx`
- `frontend/src/dev/StateSwitcher.tsx` - class names only
- `frontend/src/App.smoke.test.tsx` - only if a selector moves
- `frontend/src/styles.css` - shell block

## Acceptance

- [x] the smoke test still finds "Automatic Panorama Stitcher", now in the
      top bar.
      Evidence: `App.smoke.test.tsx` unchanged assertion
      `screen.findByText(/Automatic Panorama Stitcher/i)` still passes; the
      text now lives in `.topbar .brand-name` instead of `.hero h1`.
- [x] with a config of `max_upload_files: 6` the lede reads "Upload 2–6
      frames" (test).
      Evidence: added
      `App.smoke.test.tsx › "reads the lede's upper bound from a
      server-provided config (10b)"`, which mocks `fetchClientConfig` to
      resolve `{ ...FALLBACK_CONFIG, max_upload_files: 6 }` and asserts the
      lede text. Also added a companion test for the fallback (8) case.
- [x] the privacy sentence renders exactly once and the footer element is
      gone.
      Evidence: "Processed in memory · never stored" now renders once, in
      `.topbar .privacy`; `<footer className="appfoot">` and its CSS block
      are deleted from `App.tsx`/`styles.css`.
- [x] `PanelHead` renders index, title, and aside, and omits the aside
      element when none is given (test).
      Evidence: `components/PanelHead.test.tsx`, three cases (index/title/
      aside render; aside omitted; trailing children render).
- [x] at 1440px the rail and stage bounding boxes have equal height in
      `Empty`, `Complete`, and `Rejected`, measured in the browser and
      recorded in the PR (A13; jsdom has no layout).
      Evidence (`npm run dev:mock`, `getBoundingClientRect().height` on the
      `.work` grid's two children): Empty 790.09px / 790.09px; Complete
      1087.71px / 1087.71px; Rejected 1033.94px / 1033.94px — equal in all
      three states.
- [x] no horizontal page scroll at 1440px, 960px, and 375px (A10).
      Evidence: `document.body.scrollWidth <= document.documentElement.clientWidth`
      at all three widths. This surfaced a real bug during verification: the
      mock-only `.grp` button row and the top bar's brand name both
      overflowed at 375px (`scrollWidth` 426px against a 375px viewport).
      Fixed by wrapping `.mockbar .grp` at the 600px breakpoint and by
      truncating `.brand-name` with `text-overflow: ellipsis` inside a
      `min-width: 0` flex chain (`.topbar-inner` → `.brand` → `.brand-name`),
      with `.status-pill` given `flex: none` so it never shrinks instead.
      Re-verified clean after the fix.
- [x] a production build contains no `StateSwitcher` code (A12).
      Evidence: `test/build-exclusion.test.ts` (unchanged, part of `npm test`)
      builds with `VITE_MOCK_API` unset and asserts the bundle excludes
      mock-only markers; still green after this slice's `StateSwitcher`
      class-name changes.
- [x] copy guard, Vitest, lint, and build green.
      Evidence: `make test` → 94 backend + 123 frontend tests passed;
      `make lint` → ruff clean, `npm run lint` (tsc -b) clean; `make
      frontend-build` → built in ~440ms with no errors.
- [x] screenshots of `Empty` at 1440px and 375px.
      Verified visually in-browser via `npm run dev:mock` (both widths
      render the new top bar / page head / workspace grid / floating mock
      bar correctly); not persisted as image files in this environment — see
      the final report's "not verified" note.

## Decisions

- `PanelHead` groups the index+title and the aside+children into two flex
  children (`.panel-head-title`, `.panel-head-trail`) rather than four flat
  siblings, so it drops into the existing `.panel-head { justify-content:
  space-between }` rule unchanged. This means `ControlRail`, `OutputCanvas`,
  and `Diagnostics` (not in this slice's file list) keep their current visual
  behaviour — including their own `.counter`/`.kicker` markup, left
  unconverted — until 10c/10d/10e adopt `PanelHead` directly. `.panel-head`
  itself now carries the full section 3.1/2.3 treatment (14px 18px padding,
  56px min-height, `--border` underneath, edge-to-edge via a negative margin
  that cancels `.panel`'s own padding), which is this slice's to own per the
  parent plan's block split.
- The v1 hero/footer text ("Turn overlapping photographs into one wide view
  with an explainable SIFT/ORB pipeline.", "Images are processed in memory
  and never stored.") is replaced by the section 3 top-bar/page-head copy
  exactly as specified; no v1 copy survives.
