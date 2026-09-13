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

- [ ] the smoke test still finds "Automatic Panorama Stitcher", now in the
      top bar;
- [ ] with a config of `max_upload_files: 6` the lede reads "Upload 2–6
      frames" (test);
- [ ] the privacy sentence renders exactly once and the footer element is
      gone;
- [ ] `PanelHead` renders index, title, and aside, and omits the aside
      element when none is given (test);
- [ ] at 1440px the rail and stage bounding boxes have equal height in
      `Empty`, `Complete`, and `Rejected`, measured in the browser and
      recorded in the PR (A13; jsdom has no layout);
- [ ] no horizontal page scroll at 1440px, 960px, and 375px (A10);
- [ ] a production build contains no `StateSwitcher` code (A12);
- [ ] copy guard, Vitest, lint, and build green;
- [ ] screenshots of `Empty` at 1440px and 375px.
