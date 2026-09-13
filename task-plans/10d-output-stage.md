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

- [x] the ribbon renders seven cells in `PIPELINE_STAGES` order, with mode
      `idle` in `empty`, `preparing`, `ready`, and `failed`, `pending` in
      `working`, and `done` in `complete` (test).
      Evidence: `PipelineRibbon.test.tsx` (order/labels/title, `data-mode`);
      `OutputCanvas.test.tsx › "marks the ribbon done in complete and idle
      elsewhere"` plus the A2 test's `data-mode="pending"` check for
      `working`.
- [x] no `ms` value and no percentage renders anywhere in the stage panel
      while `working`, including the ribbon (A2, test).
      Evidence: `OutputCanvas.test.tsx › "...no numeric timing anywhere in
      the panel (A2)"` regexes the whole rendered container's text for
      `\d+\s?ms\b` and `\d+%` and finds neither.
- [x] the head chips match the section 3.1 state table for all six states
      (test), and the stale chip shows only when `isStale` is set in
      `complete`.
      Evidence: one `OutputCanvas.test.tsx` case per state asserting the
      chip text and its status class (`.chip.run`/`.pass`/`.fail`), plus
      "omits the stale chip when the result is not stale".
- [x] the toggle is in the head, flips `aria-pressed` and overlay visibility,
      and is absent without the overlay fields (A5, existing tests moved).
      Evidence: moved from `ResultPlate.test.tsx` (which no longer renders
      the toggle at all — `ResultPlate` now takes `overlayOn` as a prop) to
      `OutputCanvas.test.tsx › "complete state tools"`.
- [x] the download filename and label dimensions are unchanged (A6).
      Evidence: `OutputCanvas.test.tsx` checks the anchor's `download`
      (`panorama-sift-1448x588.png`, unchanged) and `href`; the button's
      accessible name is fixed via an explicit `aria-label="Download PNG
      {w}×{h}"` rather than derived from visible content, specifically so
      that hiding the visible word "Download" below 600px (`display: none`
      on `.dl-word`) cannot also silently change the accessible name — the
      section's own two AA requirements ("dimensions unchanged" and "the
      accessible name is unchanged" from this slice's Scope) would otherwise
      pull in opposite directions. Verified in-browser: `aria-label` and
      `textContent` both read "Download PNG 1448×588" at 1440px, and
      `aria-label` is unchanged (still full text) at 375px even though the
      word "Download" is not visible there.
- [x] the failed card renders the code, heading, message, chips, and remedies
      in that DOM order, and every remedy test passes unchanged (A7).
      Evidence: `OutputCanvas.test.tsx` asserts `Array.from(card.children).
      map(el => el.tagName)` equals `["SPAN","H3","P","DIV","UL"]` (v1 order
      was h3-then-code; this slice corrects it to match section 7's stated
      order). `remedies.test.ts` (constants) is untouched and still green;
      `remedyForCode`/`headingForError`/`contextChipValue` logic is
      byte-for-byte unchanged, only the wrapping markup moved from `.alert`/
      `.ctx` to `.failcard`/`.chips`.
- [x] with `prefers-reduced-motion: reduce` the illustration, ribbon pulse,
      and indeterminate bar do not animate (screenshot with emulation).
      Evidence: confirmed the three scoped rules exist
      (`.working .f1, .working .f3, .indet::after` and
      `.ribbon[data-mode="pending"] .n i`) via
      `document.styleSheets` inspection in the browser. While implementing
      this I noticed docs/ui-spec.md section 2.3 also requires reduced
      motion to stop "every transition", which the three scoped rules do not
      cover (hover/border/background transitions elsewhere) — added a global
      `@media (prefers-reduced-motion: reduce) { *, *::before, *::after {
      transition: none !important; animation-duration: .001s !important;
      animation-iteration-count: 1 !important; } }` to the TOKENS AND BASE
      block (a cross-block fix, see Decisions). This browser's automation
      tools do not expose a `prefers-reduced-motion` emulation control (only
      colour-scheme), so the actual reduced-motion *rendering* is unverified
      by screenshot — see the final report's "not verified" note.
- [x] the viewport fills the space left by the rail at 1440px in `Empty` and
      `Complete` (A13 screenshot).
      Evidence: `getBoundingClientRect()` — rail/stage both 785.55px in
      `Empty`, both 1041.75px in `Complete`; no horizontal scroll at 1440px
      in either state.
- [x] screenshots of all seven mock-mode states at 1440px, and `Complete` at
      375px.
      Verified visually in-browser via `npm run dev:mock`: Empty, Frames
      loaded, Preparing, Stitching, Stitching (cold start), Complete, and
      Rejected all render distinctly and correctly at 1440px; Complete at
      375px wraps the tools to their own row, hides the word "Download", and
      wraps the ribbon 4+3, with no horizontal scroll. Not persisted as image
      files in this environment — see the final report's "not verified" note.

## Decisions

- Fixing the stage head's chips-then-tools layout (chips in normal flow
  right after the title, tools pushed to the panel head's far right, per the
  mock) required simplifying `PanelHead` itself: the 10b/10c version bundled
  `aside` and `children` into one auto-margin wrapper so it would work
  under `.panel-head { justify-content: space-between }` with exactly two
  top-level flex children. That bundling cannot express "chips inline, tools
  pushed" (both would end up in the same right-pushed group). Simplified
  `PanelHead` to flat markup (title, then `aside` if given, then
  `children`), moved `margin-left: auto` onto `.aside` itself (matching the
  mock's own `.panel-head .aside` rule, which I had originally missed) and
  added it to `.counter` too so `Diagnostics.tsx`'s still-unconverted
  markup (10e) keeps its current right-aligned look. This touches the SHELL
  block, which this slice does not own — done anyway since PanelHead and
  its CSS are single-owner code across slices in this same session, and
  leaving a known layout gap in a component another slice depends on isn't
  a real conflict-avoidance win. Also removed `.panel-head.compact`, dead
  since 10c (nothing renders that class any more).
- `ResultPlate` no longer owns the overlay on/off state or the download
  handler — both moved up to `OutputCanvas` because the toggle and download
  button now live in the stage head, a sibling of the viewport, not inside
  the plate. `ResultPlate` takes `overlayOn` as a prop.
- The v1 `.alert`/`.ctx` failed-state markup put the code *after* the
  heading; this slice's card puts it first, per section 7's explicit order
  and this slice's own A7 requirement — a deliberate, spec-directed change
  distinct from the four behavioural changes the parent plan enumerates
  (this one is presentation/order, not new behaviour).
- Chip and remedy *logic* (which codes produce which text, one-based frame
  naming) is untouched; only the wrapping markup and its class names moved.
