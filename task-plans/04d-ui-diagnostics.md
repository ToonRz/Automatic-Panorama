# Task 04d - diagnostics evidence block

- Owner: Member D
- Reviewers: Member B, Member A
- Branch: `feature/04d-ui-diagnostics`
- Depends on: 04b
- Spec: `docs/ui-spec.md` section 6.1

## Scope

The full-width evidence band under the workspace: six summary cards, the
per-pair geometry table, and the stage timing chart.

Members A and B review because they compute these numbers and are the people who
can catch a card that means something other than what it says.

## Acceptance

- [ ] every element in the section 6.1 table reads from its named source, with
      no value invented or recomputed beyond the sums and bar widths listed there;
- [ ] the inlier ratio card shows the minimum and the reprojection card shows the
      maximum, each labelled as the worst pair;
- [ ] the per-pair table renders one row per pair with aligned tabular figures,
      and scrolls inside its own container below 900px;
- [ ] the chart scales bars against the largest stage and states the total;
- [ ] an unrecognised key in `stage_timings_ms` renders as an extra bar rather
      than being dropped;
- [ ] a two-image run and a three-image run both render correctly;
- [ ] tests cover the worst-pair selection and the unknown-stage case;
- [ ] screenshot of the complete diagnostics band.
