# Task 10d - output stage

- Owner: TBD
- Reviewers: TBD
- Depends on: 10b
- Spec: `docs/ui-spec.md` sections 3.1 (stage), 4, 5, 6.1-6.3, 7, A1, A2, A5,
  A6, A7, A13
- Parent: `task-plans/10-graphite-redesign.md`

## Scope

Rebuild the output panel to the section 3.1 stage anatomy: head with chips and
tools, a matte viewport that absorbs the rail's height, and the stage ribbon.
What each state shows and where each value comes from are unchanged.

- `PanelHead` with index 3 and the per-state title and chips from the
  section 3.1 state table. The complete state adds `{detector}`,
  `{n} frames`, and `order 1 → 2 → 3` chips, moved here from the diagnostics
  heading, and the stale chip replaces `.stale-note`.
- Move the overlay toggle and download button from `.plate-foot` into the
  head's tools. The download label is `Download PNG` plus mono `W×H`; below
  600px the word "Download" is visually hidden and the accessible name is
  unchanged.
- Viewport: matte with the dot grid, `flex: 1`, the section 3.1 min-heights,
  the panorama plate with a drop shadow, and the mono caption
  `W × H · MP · PNG`. Overlay label backings read `--scrim`.
- `EmptyState`: the decorative frames illustration, empty copy or
  ready/preparing copy built from the current selection and settings, and the
  status-colour legend.
- `WorkingState`: the illustration with the alignment motion, the heading
  "Stitching {n} frames with {detector}…", the section 3.1 note, the
  indeterminate bar, and the existing cold-start note. The seven-stage list
  leaves the viewport.
- `FailedState`: the card layout with the error code as an eyebrow above the
  heading (section 7). Heading, message, chip, and remedy logic are
  unchanged.
- New `PipelineRibbon`: seven cells from `PIPELINE_STAGES`, in `idle`,
  `pending`, or `done` mode. Add a `short` label to each `PIPELINE_STAGES`
  entry, and put the full label in each cell's `title`.
- `OutputCanvas` gains the props the new copy needs: `detector`,
  `ratioThreshold`, `ransacThreshold`, and the file count (already available
  as `files`).

## Files

- `frontend/src/components/OutputCanvas/OutputCanvas.tsx`, `OutputCanvas.test.tsx`
- `frontend/src/components/OutputCanvas/EmptyState.tsx`
- `frontend/src/components/OutputCanvas/WorkingState.tsx`
- `frontend/src/components/OutputCanvas/FailedState.tsx`
- `frontend/src/components/OutputCanvas/ResultPlate.tsx`, `ResultPlate.test.tsx`
- `frontend/src/components/OutputCanvas/Overlay.tsx`, `Overlay.test.tsx` - token colours only
- `frontend/src/components/OutputCanvas/PipelineRibbon.tsx` - new, plus test
- `frontend/src/constants/pipeline.ts` - `short` labels
- `frontend/src/App.tsx` - pass the new props
- `frontend/src/styles.css` - stage block

## Acceptance

- [ ] the ribbon renders seven cells in `PIPELINE_STAGES` order, with mode
      `idle` in `empty`, `preparing`, `ready`, and `failed`, `pending` in
      `working`, and `done` in `complete` (test);
- [ ] no `ms` value and no percentage renders anywhere in the stage panel
      while `working`, including the ribbon (A2, test);
- [ ] the head chips match the section 3.1 state table for all six states
      (test), and the stale chip shows only when `isStale` is set in
      `complete`;
- [ ] the toggle is in the head, flips `aria-pressed` and overlay visibility,
      and is absent without the overlay fields (A5, existing tests moved);
- [ ] the download filename and label dimensions are unchanged (A6);
- [ ] the failed card renders the code, heading, message, chips, and remedies
      in that DOM order, and every remedy test passes unchanged (A7);
- [ ] with `prefers-reduced-motion: reduce` the illustration, ribbon pulse,
      and indeterminate bar do not animate (screenshot with emulation);
- [ ] the viewport fills the space left by the rail at 1440px in `Empty` and
      `Complete` (A13 screenshot);
- [ ] screenshots of all seven mock-mode states at 1440px, and `Complete` at
      375px.
