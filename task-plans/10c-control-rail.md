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

- [ ] the detector is a radiogroup named "Feature detector" with radios named
      SIFT and ORB; arrow keys change the selection and call
      `onDetectorChange`; both radios are disabled in `working` and
      `preparing`. This replaces the `combobox` assertion in
      `ControlRail.test.tsx` (A17);
- [ ] each slider's `--p` is `0%` at its minimum, `100%` at its maximum, and
      proportional at the default (test);
- [ ] every existing `primaryButtonSpec` label test passes unchanged;
- [ ] the highlighted-rows test (`.file.invalid` count) passes unchanged;
- [ ] the tall dropzone shows with no files, the compact one with files, and
      neither in `working` or `complete` (test);
- [ ] the meta row renders the prepared upload total, not the original bytes
      (test);
- [ ] keyboard reaches the file input, each remove button, both radios, both
      sliders, the primary button, and Cancel, each with a visible focus ring
      (A11, recorded in the PR);
- [ ] the action footer sits at the bottom of the rail in `Frames loaded` at
      1440px (A13 screenshot);
- [ ] screenshots of `Empty`, `Frames loaded`, `Stitching`, and `Rejected`
      with highlighted rows.
