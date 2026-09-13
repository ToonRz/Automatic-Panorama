# Task 10c - control rail

- Owner: TBD
- Reviewers: TBD
- Depends on: 10b
- Spec: `docs/ui-spec.md` sections 1 (order line), 3.1 (rail), 4, A11, A13, A17
- Parent: `task-plans/10-graphite-redesign.md`

## Scope

Restyle and restructure the control rail to the section 3.1 anatomy. The
`primaryButtonSpec` state table and every label it produces are unchanged.

- Two `PanelHead`s: `1 Source frames` with the `n / max` counter, and
  `2 Method` with the aside "Defaults from server".
- `Dropzone`: a tall variant when no files are chosen, and a compact row
  ("Add more frames", "Appended after frame NN", a Browse affordance) once
  files exist. Browse is a styled `span` inside the existing `label`, not a
  nested `button`. Show/hide rules stay as they are today.
- `FileList`: thumbnail with the two-digit index overlaid, name with ellipsis,
  mono meta line `W×H → W×H · size`, 26px remove button. Invalid rows keep the
  `.file.invalid` class, gain a `--fail` border, and show the error line under
  the meta.
- Move the order sentence under the list, beside the upload total, and reword
  it to "Frames stitch in list order — capture order, left to right."
- `PipelineSettings`:
  - detector: a `role="radiogroup"` named "Feature detector" made of two
    native radio inputs, visually a segmented control, with the sub-lines
    "Scale-invariant · slower" and "Binary · faster";
  - sliders: value box to the right of the label, track filled with `--accent`
    up to the value (a `--p` custom property set from the value), a min/max
    scale line read from `constants/thresholds.ts`, and the section 3.1 hint
    copy.
- Action footer pinned to the bottom of the rail: primary button with no arrow
  glyph, the ghost variant for failed and busy, Cancel under it while working,
  and the meta row `{n} frames · {detector}` and `≈ {bytes} upload` once a
  file is chosen.
- Restyle `selection-error` in `--fail` and `cancelled-note` in `--muted`.

## Files

- `frontend/src/components/ControlRail/ControlRail.tsx`
- `frontend/src/components/ControlRail/Dropzone.tsx`
- `frontend/src/components/ControlRail/FileList.tsx`
- `frontend/src/components/ControlRail/PipelineSettings.tsx`
- `frontend/src/components/ControlRail/ControlRail.test.tsx`
- `frontend/src/styles.css` - rail block

## Acceptance

- [x] the detector is a radiogroup named "Feature detector" with radios named
      SIFT and ORB; arrow keys change the selection and call
      `onDetectorChange`; both radios are disabled in `working` and
      `preparing`. This replaces the `combobox` assertion in
      `ControlRail.test.tsx` (A17).
      Evidence: `ControlRail.test.tsx › "ControlRail detector radiogroup
      (A17)"` (5 cases: named radiogroup + radios, click changes selection,
      arrow-key changes selection and calls `onDetectorChange`, both enabled
      in `ready`, both disabled in `working`/`preparing`). Implemented as two
      real `<input type="radio" name="detector">` sharing a name, visually
      hidden with the existing `.sr-only` utility inside a styled `<label>`,
      so arrow-key roving focus is native browser/user-event behaviour, not
      custom key handling; verified this works under jsdom + user-event
      (the test passes without any extra keydown code). Each radio carries
      its own `aria-label="SIFT"`/`"ORB"` so the accessible name is exactly
      the detector name, not the name plus the visible sub-line text that
      shares the same `<label>`.
- [x] each slider's `--p` is `0%` at its minimum, `100%` at its maximum, and
      proportional at the default (test).
      Evidence: `ControlRail.test.tsx › "ControlRail sliders (--p custom
      property)"`. `sliderFillStyle` rounds to avoid floating-point noise
      (e.g. `50.000000000000014%`) so the test can assert exact percentages.
- [x] every existing `primaryButtonSpec` label test passes unchanged.
      Evidence: all pre-existing `ControlRail primary button` cases pass
      unmodified; `primaryButtonSpec` itself is untouched.
- [x] the highlighted-rows test (`.file.invalid` count) passes unchanged.
      Evidence: "highlights the file rows a server error names (I9)" passes
      unmodified.
- [x] the tall dropzone shows with no files, the compact one with files, and
      neither in `working` or `complete` (test).
      Evidence: `ControlRail.test.tsx › "ControlRail dropzone variant"`.
- [x] the meta row renders the prepared upload total, not the original bytes
      (test).
      Evidence: "shows the action-footer meta row..." asserts `"≈ 20 KB
      upload"` from two 10 KB prepared files (`File` constructor bytes would
      otherwise report far smaller sizes); the FileList total row test was
      rewritten in the same spirit (old assertion checked the literal prefix
      "Upload total ·", which section 3.1 replaces with the order sentence —
      rewritten per the task's "rewrite, don't delete" instruction while
      still asserting the prepared-byte value).
- [x] keyboard reaches the file input, each remove button, both radios, both
      sliders, the primary button, and Cancel, each with a visible focus ring
      (A11, recorded in the PR).
      Evidence (`npm run dev:mock`, Tab from the dropzone): the compact
      dropzone's Browse label, each `.x` remove button, the SIFT/ORB
      segments (ring shown via `.seg-option:has(input:focus-visible)` since
      the radio itself is visually hidden), both range inputs (native
      `outline: 2px solid var(--accent)` from the base focus rule, confirmed
      via `getComputedStyle(document.activeElement)` →
      `outlineColor: rgb(142, 140, 255)` = `--accent`), and the primary/
      Cancel buttons all show the accent ring when tabbed to.
- [x] the action footer sits at the bottom of the rail in `Frames loaded` at
      1440px (A13 screenshot).
      Evidence: `getBoundingClientRect()` in-browser — rail and stage both
      915.80px tall; `.action`'s bottom edge (1080.70px) sits at the rail's
      bottom edge (1081.70px, the 1px difference being the rail's own
      border).
- [x] screenshots of `Empty`, `Frames loaded`, `Stitching`, and `Rejected`
      with highlighted rows.
      Verified visually in-browser via `npm run dev:mock` at 1440px (all
      four states render correctly, including the two `.file.invalid` rows
      with a 45%-alpha `--fail` border in `Rejected`, confirmed both visually
      and via `getComputedStyle` → `color(srgb 1 0.42 0.42 / 0.45)`); not
      persisted as image files in this environment — see the final report's
      "not verified" note.

## Decisions

- `ControlRail`'s form and file list now use `PanelHead` for both headers
  (not explicitly required by the acceptance list, but named in this
  slice's own "Scope" section: "Two `PanelHead`s..."). The divider above the
  second head is a generic rule, `.rail .panel-head:not(:first-child) {
  border-top: ... }`, rather than a per-instance modifier, matching how the
  mock draws it (an explicit border on the second head, not a shared
  section-boundary rule) without adding an API to `PanelHead` itself.
- `.panel.rail` zeroes the shared `.panel` padding and moves it onto
  `.section`/`.action` instead (each per its own section 2.3 padding value),
  which also makes `PanelHead`'s edge-to-edge negative-margin trick from 10b
  a no-op here (overridden to `margin: 0`) since there is no outer padding
  left to cancel. This is a rail-block-only override; the SHELL block from
  10b is unmodified.
- The v1 `<select>`-based detector field and its CSS are removed outright
  (replaced by the radiogroup); `.panel-head.compact`, added in 10b for this
  same component, is now unused since both rail heads get the identical
  `PanelHead` treatment — left in the SHELL block as harmless dead CSS
  rather than editing a block this slice doesn't own.
- Slider thumb/track colours that the mock hardcodes as `#fff` / `rgba(0,0,0,.4)`
  are expressed as `var(--text)` and `color-mix(in srgb, black 40%,
  transparent)` respectively, keeping every colour in `styles.css` a token
  reference (per the ongoing "hex/rgba only in the token block" rule).
