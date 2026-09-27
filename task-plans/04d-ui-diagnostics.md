# Task 04d - diagnostics evidence block

- Owner: Member D
- Reviewers: Member B, Member A
- Depends on: 04b
- Spec: `docs/ui-spec.md` section 6.1

## Scope

The full-width evidence band under the workspace: six summary cards, the
per-pair geometry table, and the stage timing chart.

Members A and B review because they compute these numbers and are the people who
can catch a card that means something other than what it says.

## Acceptance

Status: shipped as `2a19667` directly on `main`, with no pull request. Boxes
checked on 2026-09-28 against `main` at `9ff021a` (CI run 36341167597 green).

- [x] every element in the section 6.1 table reads from its named source, with
      no value invented or recomputed beyond the sums and bar widths listed there;
      Evidence: `SummaryCards.test.tsx`, `PairTable.test.tsx`, and
      `StageChart.test.tsx` (A3). This holds for the elements the section 6.1
      table lists. The survival funnel added later in `ed832f4` computes
      more than that; `docs/ui-spec.md` section 13 records it as G1 and G2.
- [x] the inlier ratio card shows the minimum and the reprojection card shows the
      maximum, each labelled as the worst pair;
      Evidence: `SummaryCards.test.tsx` › "shows the minimum inlier ratio and
      maximum reprojection error, not an average (A4)" and "names the
      one-based pair the worst … came from (A3)".
- [x] the per-pair table renders one row per pair with aligned tabular figures,
      and scrolls inside its own container below 900px;
      Evidence: `PairTable.test.tsx` › one row per pair for three- and
      two-image runs; the table sits in its own horizontal-scroll wrapper
      (A10). Since task 10b the stacking breakpoint is 960px, not 900px.
- [x] the chart scales bars against the largest stage and states the total;
      Evidence: `StageChart.test.tsx` › "scales the peak stage…" and "states
      the sum of every stage as the chart total…".
- [x] an unrecognised key in `stage_timings_ms` renders as an extra bar rather
      than being dropped;
      Evidence: `StageChart.test.tsx` › "renders every known stage plus an
      unrecognised key as an extra bar, using the key as its label".
- [x] a two-image run and a three-image run both render correctly;
      Evidence: `PairTable.test.tsx` › "renders one-based row per pair for a
      three-image run" and "renders exactly one one-based row for a
      two-image run".
- [x] tests cover the worst-pair selection and the unknown-stage case;
      Evidence: the `SummaryCards.test.tsx` and `StageChart.test.tsx` cases
      above.
- [ ] screenshot of the complete diagnostics band.
      **Not recorded.** The slice had no pull request to carry it.
