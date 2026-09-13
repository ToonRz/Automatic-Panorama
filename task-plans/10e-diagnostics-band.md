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

- [ ] with `result = null` the band renders six `—` values, the
      "No accepted pairs yet" row, and the timings empty text, and no digit
      appears in any KPI value, table body, or timing row (A15, test);
- [ ] with `stitch-success.json` the strip reads `5,566`, `1,152`, `1,025`,
      `0.87` with "pair 2 → 3", `0.09 px` with "pair 1 → 2", and
      `1448 × 588` with `0.85 MP · image/png` (A3, A4, test);
- [ ] `argMin` and `argMax` return the first index on a tie (test);
- [ ] an unrecognised stage key still renders as an extra bar (existing
      test);
- [ ] the pair cell `title` still names both files (existing test);
- [ ] at 375px the table scrolls inside its container and the page does not
      (A10);
- [ ] at 1440px the table and timing panels have equal height (screenshot);
- [ ] screenshots of `Empty` and `Complete` at 1440px, and `Complete` at
      375px.
