# Task 10e - diagnostics band

- Owner: TBD
- Reviewers: TBD
- Depends on: 10b, 10d
- Spec: `docs/ui-spec.md` sections 3.1 (diagnostics), 6.1, 6.4, A3, A4, A10, A15
- Parent: `task-plans/10-graphite-redesign.md`

## Scope

Render the diagnostics band in every state, and restyle it into the KPI strip
plus the pair table and stage timing panels.

- `App` always renders `Diagnostics`; its `result` prop becomes
  `StitchResponse | null`.
- Heading row: "Alignment diagnostics" with the section 6.4 lede for each
  state. Remove the detector/frames/order counter, which 10d moved to the
  stage head.
- `SummaryCards` becomes the KPI strip: one panel with six equal cells.
  Labels, sources, and number formats are unchanged. The inlier-ratio and
  reprojection cells add the one-based pair they came from (the first pair
  wins a tie). With no result every value and secondary line is `—`.
- `PairTable`: a panel titled "Per-pair geometry" with the aside
  "{k} pairs · all accepted", pair index badges, right-aligned mono numerics,
  a `--pass` bar in the inlier-ratio cell, and a verdict pill. With no result
  it keeps its header and renders one row, "No accepted pairs yet".
- `StageChart`: a panel titled "Stage timings" with the aside
  "{total} ms total", rows of short label, bar, and `x.x ms`, with the peak
  bar at full opacity. Unknown keys still render with the key as the label.
  With no result it shows "Timings arrive with the response". The axis ticks
  row is removed.
- Lay the table and chart out 7fr / 5fr at equal height, stacking at 1180px.
  The table scrolls inside its own container.

## Files

- `frontend/src/App.tsx` - always render `Diagnostics`
- `frontend/src/components/Diagnostics/Diagnostics.tsx`, `Diagnostics.test.tsx`
- `frontend/src/components/Diagnostics/SummaryCards.tsx`, `SummaryCards.test.tsx`
- `frontend/src/components/Diagnostics/PairTable.tsx`, `PairTable.test.tsx`
- `frontend/src/components/Diagnostics/StageChart.tsx`, `StageChart.test.tsx`
- `frontend/src/utils/stitchStats.ts` - `argMin` / `argMax`, plus test
- `frontend/src/styles.css` - diagnostics block

## Acceptance

- [x] with `result = null` the band renders six `—` values, the
      "No accepted pairs yet" row, and the timings empty text, and no digit
      appears in any KPI value, table body, or timing row (A15, test).
      Evidence: `Diagnostics.test.tsx › "renders six dashes, the no-pairs
      row, and the timings placeholder with no result (A15)"` asserts all
      six `.kpi .v` cells equal "—" and the whole container's `textContent`
      does not match `/\d/`; `SummaryCards.test.tsx` and `PairTable.test.tsx`
      each carry their own component-level A15 case.
- [x] with `stitch-success.json` the strip reads `5,566`, `1,152`, `1,025`,
      `0.87` with "pair 2 → 3", `0.09 px` with "pair 1 → 2", and
      `1448 × 588` with `0.85 MP · image/png` (A3, A4, test).
      Evidence: `SummaryCards.test.tsx` asserts every one of these values and
      pair labels directly against `successWithOverlayFixture`; re-verified
      in the browser (`npm run dev:mock`, Complete) with the identical
      figures rendered on screen.
- [x] `argMin` and `argMax` return the first index on a tie (test).
      Evidence: `stitchStats.test.ts` (new file, not in the original file
      list — added because the task explicitly calls for a test alongside
      the new functions).
- [x] an unrecognised stage key still renders as an extra bar (existing
      test).
      Evidence: `StageChart.test.tsx`'s pre-existing case passes unmodified;
      the PIPELINE_STAGES-first-then-unknown-keys ordering from v1 is kept
      (not simplified to raw `Object.keys` order) specifically so this stays
      true regardless of a real response's own JSON key order.
- [x] the pair cell `title` still names both files (existing test).
      Evidence: `PairTable.test.tsx › "puts the pair's file names in the
      cell's title"`, adapted to a custom text matcher (see Decisions) but
      asserting the identical `title` value.
- [x] at 375px the table scrolls inside its container and the page does not
      (A10).
      Evidence: found and fixed a real bug while verifying this — see
      Decisions. After the fix, `window.scrollX` stays `0` after
      `window.scrollTo(500, 0)` at 375px (Complete), while
      `.tablewrap.scrollWidth > .tablewrap.clientWidth` (the table does
      scroll inside its own container).
- [x] at 1440px the table and timing panels have equal height (screenshot).
      Evidence: `getBoundingClientRect()` — both 176.5px with no result,
      both 330px with `stitch-success.json`.
- [x] screenshots of `Empty` and `Complete` at 1440px, and `Complete` at
      375px.
      Verified visually in-browser via `npm run dev:mock`: heading/lede,
      KPI strip, pair table, and stage chart all render correctly in both
      states at 1440px, and the 375px Complete view shows the table
      scrolling inside its own bordered box with a visible scrollbar while
      the page stays put. Not persisted as image files in this environment —
      see the final report's "not verified" note.

## Decisions

- **Real bug found and fixed (A10):** `.diag-row`'s and `.work`'s
  below-breakpoint collapse used a bare `grid-template-columns: 1fr`, which
  is `minmax(auto, 1fr)` by the CSS Grid spec — the `auto` minimum let the
  six-column pair table force the grid track (and the whole page) wider
  than the viewport at 375px, even though `.tablewrap { overflow-x: auto }`
  was already correct. Changed both to `minmax(0, 1fr)`, the standard fix
  for "table overflows a grid/flex layout" (`.work`'s 960px breakpoint had
  the identical latent bug, not yet triggered by anything in 10a-10d, but
  the diagnostics band's own wide table finally exposed the pattern).
  Verified the fix with `window.scrollX` after an explicit
  `window.scrollTo`, not just a `scrollWidth`/`clientWidth` comparison
  (which can itself report a false-positive few-pixel gap tied to the
  vertical scrollbar gutter — confirmed by checking `window.innerWidth` vs
  `document.documentElement.clientWidth` differed by exactly that gap with
  `scrollX` genuinely stuck at 0).
- `PairTable`'s pair cell text ("1 → 2") is split across two `<b>` badges
  and an arrow text node (per section 3.1's "two 22px index badges with an
  arrow"), so `screen.getByText("1 → 2")` throws testing-library's
  "text is broken up by multiple elements" error. Fixed the affected tests
  with a small custom matcher (`element.textContent === text &&
  element.classList.contains("pair")`) rather than restructuring the
  markup to keep a single text node, since the split markup is what the
  anatomy actually asks for.
- `StageChart` keeps rendering a bar's label as the *raw stage-timing key*
  (e.g. `"decode"`, `"postprocess"`), not `PIPELINE_STAGES[i].short` — this
  matches the pre-existing, still-required test ("uses the key as its
  label") and was a deliberate choice not to conflate the ribbon's new
  `short` display labels (10d) with the chart's raw-key labels, which are
  two different pieces of copy in the spec.
- This slice's verification hit severe, unrelated system-level resource
  contention (load average ~195, from other applications on the host, nothing
  this session started) that made the *full* Vitest suite intermittently
  time out two unrelated tests (`App.smoke.test.tsx`'s 10b lede test and the
  A12 `build-exclusion` test, which spawns a real `vite build` subprocess).
  Both pass individually and the full suite passed cleanly with
  `--no-file-parallelism` (154/154); backend pytest passed 94/94 on its own.
  Treated as environmental, not a code defect — noted here rather than
  silently retried away.
