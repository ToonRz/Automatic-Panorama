# UI specification

The interface described here is the one drawn in
`docs/mockups/ui-mock-v2.html`, in its Graphite theme. That file is the visual
reference for composition, component shape, and copy. Sections 2 and 3 restate
its tokens, type scale, spacing, and breakpoints as numbers, because the
implementation must match them and a mock is easy to misread. This document
owns what the mock cannot express — where every value on screen comes from,
which state hides what, which error code produces which sentence, and what has
to be true before a slice can merge. Where the mock and this document disagree,
this document wins. The mock's panorama is a drawn illustration and its
failed-state numbers are invented.

`docs/mockups/ui-mock.html` is the v1 reference, kept as history. The original
implementation was split across `task-plans/04a` through `task-plans/04e`; the
Graphite redesign is `task-plans/10-graphite-redesign.md`. The backend contract
it reads from is `docs/backend-spec.md`; the overlay fields in section 6.2 are
owed by `task-plans/07h` and `task-plans/07i`.

Five parts were added after the v2 mock and each has its own reference mockup:

| Part | Section | Mockup |
| --- | --- | --- |
| intro cover | 3.2 | `docs/mockups/intro-landing-mock.html` |
| sample gallery | 3.3 | `docs/mockups/example-gallery-redesign-mock.html` |
| stage toolbar | 3, 3.1 | `docs/mockups/stage-toolbar-redesign-mock.html` |
| working-state stage display | 5, 13 | `docs/mockups/loader-redesign-mock.html` |
| feature survival funnel | 6.6 | `docs/mockups/mock_flow_dashboard.html` |

Where one of these parts departs from a rule stated earlier in this document,
section 13 records the departure instead of leaving it implied.

## 1. Scope

In scope for v1:

- upload of 2-8 frames with previews and a running byte total;
- detector choice and two geometric thresholds;
- five screen states plus a cold-start state;
- the panorama, a toggleable seam/inlier overlay, and a PNG download;
- the diagnostics evidence block: summary cards, a feature survival funnel, a
  per-pair table, and a stage timing chart;
- an intro cover that shows the server state while Render wakes;
- a sample gallery of three sets that stitch and three that are meant to fail;
- a mock mode that renders every state without a live backend.

Explicitly out of scope for v1, decided against the mock's own open list:

- drag-to-reorder frames. v1 chains the frames in upload order, so the order
  does matter, and the input rail says so in one line under the file list, beside the upload total. A
  reorder control is a v2 affordance, not a v1 omission dressed up as a
  decision. `docs/backend-spec.md` section 7.2 has the ordering rule;
- a side-by-side match visualization tab. It needs correspondence data beyond
  what section 6 asks for;
- a light theme or a theme switcher. The product is dark-committed and
  Graphite is its only theme. The v2 mock was also drawn in Navy and Light
  palettes; both were considered and dropped on 2026-09-13.

## 2. Visual system

### 2.1 Colour tokens

Graphite. Tokens live on `:root` in `frontend/src/styles.css`. Components refer
to tokens only; no component carries a hex value or an inline colour.

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#0a0a0b` | page ground, top bar (at 82% with blur) |
| `--surface` | `#121214` | panels |
| `--surface-2` | `#17171a` | insets: dropzone, file rows, segmented track, value boxes, chips, rail action footer |
| `--surface-3` | `#1e1e22` | raised insets: checked segment, slider track, pair index badges |
| `--matte` | `#0d0d0f` | panorama viewport ground |
| `--dot` | `rgba(255,255,255,.05)` | viewport dot grid, 18px pitch |
| `--scrim` | `rgba(11,11,15,.78)` | backing behind overlay labels on the panorama |
| `--border` | `rgba(255,255,255,.07)` | panel borders, row borders, dividers |
| `--border-strong` | `rgba(255,255,255,.13)` | control borders, dashed dropzone, index badges |
| `--text` | `#f4f4f5` | primary text |
| `--muted` | `#a1a1aa` | secondary text, field labels |
| `--faint` | `#85858e` | metadata, hints, placeholders, table headers |
| `--accent` | `#8e8cff` | the one interactive colour: primary button, checked segment name, slider fill, pressed toggle, focus ring |
| `--accent-ink` | `#0b0b12` | text on `--accent` |
| `--accent-soft` | `rgba(142,140,255,.14)` | pressed toggle fill, dropzone hover and drag-active fill, slider thumb halo, frames-illustration overlap |
| `--pass` | `#3ddc97` | accepted, complete, online |
| `--run` | `#f5b83d` | running, waking, preparing, stale |
| `--fail` | `#ff6b6b` | rejected, offline, invalid |

The colour rule is absolute and is what makes the screen readable at a glance:
`--pass` means a thing passed, `--run` means a thing is in motion or not yet
real, `--fail` means a thing was rejected. No component may use these three
decoratively. Interaction is `--accent` and nothing else, which is why the
primary button is violet rather than green: a green button would read as
"already accepted". The one recorded exception is the overlay (section 6.2),
whose seam lines are drawn in `--pass` and sampled correspondences in `--fail`,
as in v1.

`--faint` is `#85858e`, not the `#6b6b74` of the first v2 draft, so that it
reaches 4.5:1 on every surface (A14).

### 2.2 Type

| Role | Family | Cut | Fallback |
| --- | --- | --- | --- |
| sans: titles, body, labels | Geist | variable, 400-700 | system-ui, -apple-system, "Segoe UI", sans-serif |
| mono: numbers, codes, chips | Geist Mono | variable, 400-500 | ui-monospace, "SF Mono", Menlo, monospace |

| Element | Size / weight / tracking | Family |
| --- | --- | --- |
| page title (h1) | 26px / 600 / -0.025em; 22px below 600px | sans |
| brand name | 15px / 600 / -0.01em | sans |
| diagnostics title | 16px / 600 / -0.01em | sans |
| panel title (h2) | 14px / 600 | sans |
| viewport heading (h3) | 18px / 600; failed card 20px | sans |
| body | 14px / 400, line-height 1.5 | sans |
| field label | 13px / 500 | sans |
| secondary label, KPI label | 12.5px / 500 | sans |
| hint, metadata | 12px / 400 | sans |
| KPI value | 26px / 500 / -0.03em, unit 14px | mono |
| table numerics, value boxes | 12-12.5px / 400 | mono |
| chips, captions, index badges | 11-11.5px / 400 | mono |

Every measurement, count, ratio, error value, and error code is set in mono with
tabular figures, so that columns of numbers align. The v1 uppercase,
letter-spaced kickers ("INPUT", "OUTPUT", "METHOD") are removed. A panel is
named by a numbered index badge and a sentence-case title.

Both families are self-hosted as `woff2`, latin subset only, served from the
frontend bundle rather than a CDN. A cold Render backend already costs the demo
time; a font CDN is one more thing that can stall in a lecture hall. The v2 mock
loads them from Google Fonts only because it is a standalone file. Geist and
Geist Mono are licensed under the SIL Open Font License, and the licence files
ship alongside the font files. The v1 families (Fraunces, DM Sans, JetBrains
Mono) and their licences are removed.

### 2.3 Shape, spacing, elevation, motion

| Token or rule | Value |
| --- | --- |
| `--r-lg` | 14px: panels |
| `--r-md` | 10px: dropzone, file rows, viewport, primary and secondary buttons, segmented track |
| `--r-sm` | 6-7px: chips, value boxes, segments, index badges, tool buttons (8px) |
| border | 1px everywhere; the dropzone is dashed |
| panel gap | 16px, both between the workspace panels and inside the diagnostics band |
| panel head | 14px 18px padding, 56px min-height, `--border` underneath |
| rail section | 16px 18px 18px padding |
| shell | max width 1520px; 28px 32px 96px padding; 20px 14px 110px below 600px |

Panels have no shadow. Two things do: the primary button (a soft `--accent`
glow, removed when disabled) and the panorama image (a drop shadow on the
matte).

Motion is limited to three cues, all in the working state: the frames
illustration easing into alignment, the ribbon's pending pulse, and the
indeterminate bar. Hover and colour transitions last 0.2s or less.
`prefers-reduced-motion: reduce` stops all three cues and every transition. The
state change itself stays visible, because it is carried by text and colour,
not motion.

Focus is a 2px solid `--accent` outline with a 2px offset on every focusable
element.

## 3. Layout

From top to bottom:

1. **Top bar.** Sticky, 60px, with a full-width bottom border, and its content
   capped at the shell width. On the left: the brand mark (two overlapping
   rounded squares, the right one in `--accent`), the product name
   "Automatic Panorama Stitcher", and the method line
   "SIFT / ORB · RANSAC · warp · blend". On the right: the privacy line
   "Processed in memory · never stored" with a lock icon, and the status pill.
   The top bar replaces v1's hero pill and footer.
2. **Page head.** The h1 "Stitch overlapping photos into one panorama" and a
   single lede line, "Upload {min}–{max} frames in capture order. Every seam
   comes with the evidence behind it.", with the numbers read from
   `ClientConfig`.
3. **Workspace.** A grid of `384px minmax(0, 1fr)` with a 16px gap and
   `align-items: stretch`. The control rail and the output panel are always
   the same height. The output viewport is `flex: 1` and absorbs the
   difference; the rail's action footer uses `margin-top: auto` to sit at the
   rail's bottom.
4. **Diagnostics band.** Full width and rendered in every state (section 6.4):
   a heading row; the KPI strip (one panel, six equal cells split by 1px
   dividers); the feature survival funnel (section 6.6); then a row holding
   the per-pair table panel and the stage timing panel at 7fr / 5fr and equal
   height.

The intro cover (section 3.2) lies over all four on page load and is gone
once dismissed.

| Width | Change |
| --- | --- |
| above 1180px | the layout above |
| 1180px and below | KPI strip becomes 3 × 2; the table and timing panels stack |
| 960px and below | the workspace becomes one column, rail first; viewport min-height 300px; ribbon wraps 4 + 3; the privacy line hides |
| 600px and below | shell padding narrows; h1 22px; KPI strip becomes 2 × 3; the method line hides |

The stage tools follow the stage's own width (a container query on `.stage`),
not the window's. When the head is too narrow for the title, the chips and the
tools on one line, the whole toolbar wraps to its own right-aligned row; it
never splits. At a stage content width of 440px and below the toolbar spans
the head: the overlay toggle on the first row, then Download filling the
second row with the reset icon after it.

The per-pair table scrolls horizontally inside its own container. The page
never scrolls horizontally.

### 3.1 Component anatomy

**Panel head.** A 22px index badge (mono 11px, `--border-strong`, 6px radius),
the h2 title, an optional aside on the right (12.5px `--faint`), and optional
trailing content.

**Control rail**

| Part | Anatomy |
| --- | --- |
| head 1 | `1` · "Source frames" · aside `n / max` in mono, with `n` in `--text` |
| dropzone, no files | column, centred, 30px vertical padding: 38px icon tile, "Drop overlapping images", "JPG · PNG · WEBP · BMP · TIFF — up to {max_upload_mb} MB each", a "Browse files" affordance |
| dropzone, files chosen | row: 38px icon tile, "Add more frames" over "Appended after frame NN", and a "Browse" affordance on the right |
| dropzone surface | `--surface-2`, 1px dashed `--border-strong`; hover and drag-active switch to an `--accent` border and `--accent-soft` fill. The whole zone is the `label` for the hidden file input; Browse is a styled span, not a nested button |
| file row | grid of a 44 × 32px thumbnail (5px radius, cover, two-digit mono index overlaid bottom-left), name (13px / 500, ellipsis) over mono meta `W×H → W×H · size` in `--faint`, and a 26px remove button; `--surface-2`, `--border`, `--r-md` |
| invalid file row | border in `--fail` at 45%, the error line in `--fail` under the meta |
| order and total | one row under the list: "Frames stitch in list order — capture order, left to right." on the left, the mono prepared total on the right; a total error in `--fail` underneath |
| head 2 | `2` · "Method" · aside "Defaults from server" |
| detector | a radio group named "Feature detector": two native radios, visually hidden, inside a segmented `--surface-2` track with 4px padding. Each option is its name (13px / 600) over a sub-line (11.5px `--faint`): "Scale-invariant · slower", "Binary · faster". The checked option sits on `--surface-3` with an inset `--border-strong` ring and its name in `--accent` |
| slider field | the label (13px `--text`) on the left and a value box on the right (mono 12px, `--surface-2`, 58px min width); a 4px track in `--surface-3` filled with `--accent` up to the value; a 16px white thumb with an `--accent-soft` halo; a mono 10.5px scale line from `constants/thresholds.ts` ("0.50 strict" / "0.95 loose", "1 px" / "10 px"); a one-line hint |
| hints | ratio: "Keeps a match only when it clearly beats its runner-up." RANSAC: "Largest reprojection error that still counts as an inlier." |
| action footer | pinned to the rail bottom, `--surface-2`, top border. Primary button 44px, full width, `--accent` fill, `--accent-ink` 14px / 600 label, no arrow glyph. Disabled: `--surface-3` fill, `--faint` label, no glow. Ghost (failed, busy countdown): transparent with a `--border-strong` border. Cancel: a 36px outlined secondary under it, in `working` only. A meta row (12px `--faint`) reads `{n} frames · {detector}` and mono `≈ {bytes} upload` once any file is chosen |
| head 3 | `3` · "Try a sample" · aside "no upload needed". It and the sample gallery under it (section 3.3) show whenever the dropzone does (`empty`, `preparing`, `ready`, `failed`) and hide in `working` and `complete` |

**Output stage**

| State | Title | Chips, left to right | Tools | Viewport | Ribbon |
| --- | --- | --- | --- | --- | --- |
| `empty` | Panorama | `Waiting for frames` | none | placeholder, empty copy | idle |
| `preparing` | Panorama | `Preparing` in `--run` | none | placeholder, ready copy | idle |
| `ready` | Panorama | `Ready · {n} frames` | none | placeholder, ready copy | idle |
| `working` | Stitching | `Running` in `--run` | none | working illustration | pending |
| `complete` | Panorama | `Complete` in `--pass`, `{detector}`, `{n} frames`, `order 1 → 2 → 3`, and `Produced with previous settings` in `--run` when stale | overlay toggle when the section 6.2 fields exist; download; new-panorama reset | panorama plate | done |
| `failed` | Not stitched | `Rejected` in `--fail` | none | failed card | idle |

| Part | Anatomy |
| --- | --- |
| chip | 24px tall, 6px radius, `--surface-2`, `--border`, mono 11.5px `--muted`; a status chip adds a 6px dot and takes the status colour |
| tools | one row in a group named "Panorama tools", left to right: the overlay toggle, a 1 × 20px `--border-strong` divider, Download, the reset. 32px buttons, 8px radius, a 12px-padded head so one row stays 56px. Overlay toggle "Seams & inliers": outlined, with a 22 × 12px switch after the label whose knob sits left in `--faint` when off; pressed means an `--accent-soft` fill, an `--accent` border at 45%, `--accent` text, and the knob right in `--accent`. Download: inverted (`--text` fill, `--bg` label, 500), reading "Download PNG" plus mono `W×H`. Reset: a 32px borderless icon (`+`, `--muted`), named "New panorama" by `aria-label`, with a tooltip "New panorama · clears frames" on hover and keyboard focus; it stays quiet because the rail already offers a labelled "+ Start new panorama". The divider is omitted with the toggle |
| viewport | 14px inset, `--r-md`, `--matte` with the `--dot` grid, `--border`; min-height 460px (300px at 960px, 220px at 600px); content centred |
| panorama plate | the image at the viewport width minus 48px (minus 20px below 600px), 4px radius, drop shadow; the overlay SVG sits exactly on the image, with label backings in `--scrim`; a caption in the bottom-right corner, mono 11px `--faint`: `W × H · MP · PNG` |
| placeholder | a decorative 300 × 130 SVG (three outlined frames, `--accent-soft` overlaps, dashed `--accent` match lines, `aria-hidden`); h3; a body line (13.5px `--muted`, 440px max); a legend of the three status colours labelled accepted / in progress / rejected |
| empty copy | h3 "The panorama lands here"; body: "Add at least two overlapping frames. You'll get the stitched image plus keypoints, matches, inlier ratio and reprojection error for every pair." |
| ready copy | h3 "{n} frames ready to stitch" (preparing: "Preparing {n} frames…"); body: "Frames will be matched with {detector} at ratio {ratio} and aligned with RANSAC at {tolerance} px." |
| working | the same illustration, outer frames easing into alignment (2.4s, alternating); h3 "Stitching {n} frames with {detector}…"; body "The server answers once, at the end. Real stage timings appear as soon as it does."; a 240 × 3px indeterminate `--run` bar; the cold-start note (section 9) below it when it applies |
| failed card | 520px max, left-aligned: the code eyebrow (mono 12px, `--fail` text on a 12% `--fail` fill with a 30% `--fail` border), the h3 heading, the message in `--muted`, context chips, and the remedy list in a `--surface-2` box (section 7) |
| ribbon | seven equal cells under the viewport, split by `--border`; each cell holds a mono two-digit index with a 7px dot, then the stage's short label (12.5px). Idle: hollow dot, `--muted` label. Pending: pulsing `--run` ring. Done: filled `--pass` dot, `--text` label. The full stage label is the cell's `title`. The ribbon never shows a timing |

Short stage labels, in `PIPELINE_STAGES` order: Decode, Features, Match,
Homography, Warp, Blend & crop, Encode.

**Diagnostics band**

| Part | Anatomy |
| --- | --- |
| heading row | h2 "Alignment diagnostics" with the lede (13px `--faint`) beside it; the lede per state is in section 6.4 |
| KPI cell | 16px 18px 18px padding; the label (12.5px `--muted`) with its qualifier ("lowest pair", "worst pair") right-aligned in 11px `--faint`; the value in mono 26px; a mono 11.5px `--faint` secondary line with ellipsis |
| survival funnel | a full-width card under the KPI strip: h3 "Feature & Inlier Survival Funnel" with an info mark, a one-line subtitle, and a "View as table" button on the right; the body is the desktop flow or the compact funnel in section 6.6 |
| pair table panel | head "Per-pair geometry", aside "{k} pairs · all accepted"; headers 12px / 500 `--faint`; cells 13px with 13px 18px padding; numerics right-aligned in mono; the pair cell as two 22px index badges with an arrow; the inlier-ratio cell as a 64px `--pass` bar (width = ratio) with its value; the verdict as a `--pass` pill on a 12% fill |
| stage timing panel | head "Stage timings", mono aside "{total} ms total"; rows of a 92px short label, an 8px `--surface-2` track with an `--accent` fill (the peak at full opacity, the rest at 85%), and a right-aligned mono `x.x ms`. An unrecognised key uses the key as its label |

### 3.2 Intro cover

`components/IntroCover/`. On page load a fixed, full-viewport cover lies over
the app. Its job is to spend the first seconds of a visit usefully. The health
check in section 9 starts at page load underneath the cover, so a sleeping
Render service is already waking while the visitor reads the title, and the
cover says so.

| Part | Behaviour |
| --- | --- |
| ground | `#0a0a0a`, above every other layer; the app underneath waits at 98% scale, 65% brightness, and a 1px blur |
| title | "AUTOMATIC", "PANORAMA", "STITCHER" on three lines, sans 800, `clamp(2.4rem, 8vw, 7rem)` (`clamp(2rem, 9vw, 3rem)` at 600px and below), white. After `document.fonts.ready`, each line is typed in turn by a stepped width animation (80, 95, and 100 ms per character, 160 ms between lines) behind a caret that keeps blinking on the last line. The stage is labelled "AUTOMATIC PANORAMA STITCHER" |
| server line | one pill reading the same availability as the top-bar pill: `SERVER LIVE · Ready to stitch` when online; `SERVER OFFLINE · Tap to proceed anyway` when offline; otherwise `WAKING SERVER · Choose photos while we connect`, announced through a polite live region |
| enter control | a button named "Swipe up or click to enter application", showing an up chevron, "SWIPE UP TO ENTER", and "or scroll / click / press space" |

Any of these dismisses the cover: a click anywhere on it, the enter control, a
wheel scroll down (`deltaY` above 15), Space, Enter, or ArrowUp, or a touch
swipe up of more than 40px. The backend state never gates entry. Frame
selection and preparation run in the browser, so a visitor can enter and
choose photos while the server is still waking.

On dismissal the cover slides up out of the viewport (`translateY(-101%)`,
0.85s) and is `aria-hidden` while it moves; the app settles to full scale,
brightness, and focus over 0.9s. When the slide ends, the cover leaves the DOM.

### 3.3 Sample gallery

`components/ExampleGallery/`, rail section 3. A visitor with no overlapping
photos at hand, or a presenter who wants a known result, loads a prepared set
in one click. The gallery also demonstrates standing rule 4 from `CLAUDE.md`:
the failure sets show that the stitcher rejects bad input with a named error
instead of returning a distorted image.

| Part | Anatomy |
| --- | --- |
| filter | a group named "Sample type" with two toggle buttons in a segmented `--surface-2` track, the same visual language as the detector: "Stitches" with a `--pass` dot and "Known failures" with a `--fail` dot, each followed by its mono count. `aria-pressed` marks the active one; "Stitches" is active by default |
| sample row | one button per set, `--surface-2`, `--border`, `--r-md`: a 96 × 44px film strip on `--matte` (thumbnails overlap for a set that stitches and sit apart, with a cross, for a failure set), the name (13px), a mono 10.5px `--faint` meta line, a "why" line (11.5px `--muted`) that opens on hover and focus and is the button's `aria-describedby`, and a trailing chevron |
| meta line | a set that stitches: `{n} frames · {fact}`. A failure set: `✕ {expected code}` in `--fail`, with "Expected error:" for screen readers. While loading: `Loading…` in `--run`. Once loaded: `Loaded into Source frames` in `--accent` |
| loaded row | `--accent-soft` fill, `--accent` border at 45%, a check in place of the chevron |
| load error | the row takes a `--fail` border and a retry glyph; under the list an alert reads "Couldn’t load “{name}”. Check your connection." with a Retry button |
| footnote | 11.5px. Stitches: "Loads the frames into Source frames, replacing anything already there." Known failures: "These sets are meant to fail. The stitcher rejects them with a named error instead of returning a distorted image." |

| Set | Kind | Frames | Meta, or expected code with SIFT / ORB |
| --- | --- | --- | --- |
| Harbour boats (`boat`) | stitches | 3 | `~40% overlap` |
| Budapest parliament (`budapest`) | stitches | 3 | `same distance` |
| Newspaper spread (`newspaper`) | stitches | 3 | `low parallax` |
| Unrelated photos (`unrelated`) | fails | 2 | `INSUFFICIENT_MATCHES` / `INSUFFICIENT_MATCHES` |
| Blank sky (`blank_sky`) | fails | 2 | `NO_DESCRIPTORS` / `NO_DESCRIPTORS` |
| Repeating pattern (`repeating`) | fails | 2 | `INSUFFICIENT_MATCHES` / `INSUFFICIENT_INLIERS` |

The expected code follows the detector selected in the rail. Each code was
measured by running the set through `services/stitcher.py` at the default
thresholds; a set run at other thresholds may fail differently, or not at all.

Loading a set fetches `/sample_images/{set}/{file}` from the frontend's own
static assets, so it needs no backend. A response that is not OK, or whose
type is not `image/*`, is a load error rather than a file: a missing asset
would otherwise come back as the single-page app's HTML under a `.jpg` name and
fail later with an unrelated decode error. A loaded set replaces the current
selection through the same validation as a pick; it never appends. While one
set loads, the other rows are disabled. A row reads as loaded when the current
selection is exactly that set's files, in order.

The three sets that stitch are byte-identical copies of OpenCV's own
stitching test data; the three failure sets are generated by
`scripts/generate_unsupported_samples.py`. `docs/demo-script.md` records the
source and licence status of every file.

## 4. States

The screen is driven by one state machine. The states are exclusive, and no
combination of booleans may produce a screen that is not one of these.

| State | Entered when | Canvas shows | Primary action |
| --- | --- | --- | --- |
| `empty` | fewer than 2 files chosen | placeholder and the pipeline ribbon | disabled, "Add two frames to start" |
| `preparing` | a valid selection is being decoded and sized | the `ready` placeholder | disabled, "Preparing images…" |
| `ready` | 2-8 files chosen | placeholder and the pipeline ribbon | enabled, "Stitch panorama" |
| `working` | request in flight | stage checklist, section 5 | disabled, "Stitching..." |
| `complete` | HTTP 200 | panorama, overlay toggle, download | enabled, "Stitch again" |
| `failed` | HTTP 400, 413, 422, 500, 503, 504, or a client-side failure (network drop, unreachable server, client timeout) | error block, section 7 | enabled, "Retry with ORB" when the detector was SIFT, otherwise "Try again"; `Try again in {s}s` while a `SERVICE_BUSY` countdown is running |

Transitions out of a settled state:

- changing the detector or either threshold while in `complete` keeps the
  panorama on screen and marks it as produced by the previous settings. The
  state stays `complete`. Silently leaving the image under new settings would
  claim a result the numbers no longer describe, and clearing it would destroy
  the user's output because a slider moved;
- picking or dropping frames appends them after the current selection in pick
  order, and each row has a remove control while the dropzone is shown; both
  count as changing the selection;
- changing the file selection from any state clears the result and the error,
  abandons preparation already in flight, and enters `preparing` before returning
  to `empty` or `ready`. The old panorama does not describe the new frames;
- submitting from `complete` or `failed` clears the previous result
  before entering `working`;
- in `working`, a secondary Cancel button aborts the request through the same
  `AbortController` and returns to `empty` or `ready` with the selection and
  settings intact, showing an inline note that clears on the next submit or
  selection (docs/integration-spec.md section 8.2). Server work is not
  cancelled;
- a stitch request left unanswered for `STITCH_REQUEST_TIMEOUT_MS` (120 s at
  defaults, docs/integration-spec.md section 8.1) is aborted client-side and
  lands in `failed` with `REQUEST_TIMEOUT`. A response that arrives after
  cancel, timeout, or a new selection is dropped by the same request-id guard
  that already protects a stale request.

Before a request, `useClientConfig` starts from `FALLBACK_CONFIG` and replaces
it once `GET /api/v1/config` succeeds after the availability state becomes
`online`. File count, per-file bytes, total bytes, and control defaults all
read this policy. A selection above the count limit is rejected as a whole;
originals above 60 MB are marked inline before decode. Each remaining frame is
decoded sequentially with EXIF orientation applied. A frame over the count-based
long-edge budget, or whose media type is not accepted by the backend, is drawn
to a canvas and encoded as JPEG at quality 0.92; an accepted frame already in
budget is uploaded byte-identical. Decode failures use the message defined in
`docs/integration-spec.md` section 6.3. Rows keep the original filename and show
the original and prepared dimensions; the upload total uses prepared bytes.
Prepared per-file and total byte failures stay in `ready`, disable the action as
"Fix the marked frames", and never become a failed run.

The output panel carries `aria-live="polite"`. Entering `preparing` announces
"Preparing images…" once. Entering `working` announces that stitching started;
entering `complete` or `failed` announces the outcome heading. Stage-by-stage
checklist changes are not announced, because reciting seven stage names during
every run is noise.

## 5. The working state

The checklist names the seven pipeline stages in the order
`docs/cv-pipeline.md` implements them: decode, features, matching, homography,
warp, blend ("Blend and crop"), and encode ("Encode PNG"). It is an ordered
list of what the request is doing, not a progress report.

No per-stage timing, percentage, or elapsed counter is displayed while the
request is in flight. `POST /api/v1/stitch` returns once, at the end. The
frontend cannot know which stage the server is on, and animating a plausible
sequence would put invented numbers on screen. The real timings arrive in
`stage_timings_ms` and are rendered in the diagnostics chart once the response
lands.

The seven stages are therefore shown as the stage ribbon under the viewport
(section 3.1), all in the same pending treatment: every dot pulses in `--run`,
no stage is ticked, and no stage is ahead of another. The viewport above it
carries the one other motion cue, an indeterminate bar. The v1 mock's
per-stage ticks and millisecond values were a picture of the finished run, not
a live feed. The ribbon turns `--pass` only in the complete state, and even
then it carries no timings; those belong to the stage timing chart.

If the request has been in flight longer than the cold-start threshold in
section 9, the cold-start message appears below the checklist.

A Cancel button sits under the primary button for the duration of `working`
only (docs/integration-spec.md section 8.2). It is reachable by keyboard and
shares the page's default focus ring.

## 6. The complete state

### 6.1 Values on screen

Everything numeric is read from the response. Nothing is computed in the
frontend except the sums and the bar widths marked below.

| Screen element | Source |
| --- | --- |
| panorama image | `image.data_url` |
| output dimensions on the download button | `image.width`, `image.height` |
| stage head chips: detector, frame count, order (section 3.1) | `diagnostics.detector`, `image_count`, `image_order` |
| Keypoints card, total and per image | sum of `keypoints_per_image`, then the list |
| Ratio-passed card | sum of `ratio_passed_matches_per_pair`, then the list |
| Inliers card | sum of `inliers_per_pair`, then the list |
| Inlier ratio card | minimum of `inlier_ratio_per_pair`, labelled as the lowest pair and naming that pair one-based; the first pair wins a tie |
| Reprojection card | maximum of `reprojection_error_per_pair`, labelled as the worst pair and naming that pair one-based; the first pair wins a tie |
| Output card | `diagnostics.output_width`, `output_height`, megapixels, `image.mime_type` |
| per-pair table rows | one row per pair, index `i` reads element `i` of each per-pair array |
| stage chart bars | `stage_timings_ms`, bar width is the stage over the largest stage |
| chart total | sum of `stage_timings_ms` values |

The inlier ratio and reprojection cards deliberately show the worst pair rather
than an average. An average hides the one seam that is about to look wrong.

The per-pair table's verdict column is derived, not sent: a pair is accepted
when it appears in a successful response. A failed run has no table because it
has no successful pairs.

`image_order` and the per-pair table's pair cell are the backend's zero-based
indices (docs/backend-spec.md section 9) rendered one-based, because the
interface counts frames the way a person does
(docs/integration-spec.md section 7.1). The pair cell's `title` attribute
names both files.

If `stage_timings_ms` contains a key the UI does not recognise, it is rendered
as an extra bar using the key as its label. The chart must not silently drop
measured time.

### 6.2 The seam and inlier overlay

The overlay is drawn as SVG on top of the panorama, in the panorama's own
coordinate space, so that it stays sharp when the image is scaled and so that
the toggle costs nothing. It requires two diagnostics fields that the pipeline
does not produce yet; `task-plans/07h` owns the seam geometry and
`task-plans/07i` owns the sampled correspondences.

Both fields are expressed in output-image pixel coordinates, the same space as
`image.width` and `image.height`, so the frontend can draw them without any
geometry of its own. Keeping the matrix arithmetic on the server matches the
rule that OpenCV work lives in `backend/app/cv/`.

- `seam_lines`: one entry per pair, `{ top: [x, y], bottom: [x, y] }`, the
  shared boundary between that pair's frames projected onto the output canvas.
  Length equals the pair count. It is a two-point line rather than a single x
  because under real perspective the boundary tilts, and a vertical line drawn
  where the seam is not would contradict the measurement the overlay exists to
  show.
- `sample_correspondences_per_pair`: for each pair, at most 12 inlier
  correspondences, each a pair of points on the output canvas. The field name
  says sample because it is a drawn illustration, not the inlier set. Nothing in
  the UI may count these points or present their number as a measurement. The
  inlier count comes from `inliers_per_pair` and nowhere else.

The overlay renders, per pair: a dashed `--pass` line from the seam's top point to
its bottom point, `--fail` circles on both points of each sampled correspondence, a
faint connecting line between them, and a mono label reading the seam number and
the inlier count from `inliers_per_pair`. The label is anchored to the seam's
top point, so it follows a tilted seam instead of floating away from it.
Labels sit on shared lines below the highest seam top point; a label whose box
would overlap an earlier label's drops to the next free line, so labels of
close seams never overprint each other.

The toggle is a two-state button reflecting `aria-pressed`. It defaults to on,
because the evidence is the point of the screen. When the overlay fields are
absent from a response, the toggle is not rendered at all and the clean image is
shown; a disabled control with no explanation is worse than no control.

### 6.3 Download

The download button always produces the clean panorama from `image.data_url`,
never the overlay composite. The deliverable is a panorama, not a debug frame,
and compositing SVG text into a canvas introduces font and tainting problems
that buy nothing here. The button label states the dimensions so that what will
be saved is unambiguous.

Filename: `panorama-<detector>-<width>x<height>.png`, lowercased.

### 6.4 Diagnostics before a result

The diagnostics band is part of the page composition in every state, not only
in complete, so the page does not collapse to a short column before the first
run. Outside complete it renders its frame with no measurement in it:

- the six KPI cells keep their labels and qualifiers, and show `—` as the value
  and as the secondary line;
- the per-pair table keeps its header row and renders one row,
  "No accepted pairs yet";
- the stage timing panel shows "Timings arrive with the response";
- the heading lede reads "Filled in after a successful run." In complete it
  reads "Read from the server response. Ratio and error show the worst pair,
  not an average."

No number, zero, previous-run value, or loading shimmer may appear in the band
outside complete or failed-with-evidence (below). A zero reads as a
measurement, and a shimmer claims that results are streaming in when
`POST /api/v1/stitch` answers once. While a stale complete result is on
screen (section 4), the band keeps its numbers, because the stale chip in the
stage head already says which settings produced them.

### 6.5 The diagnostics band on a failed run

A failure that reached gate 6 or gate 7 carries `partial_diagnostics`
(docs/backend-spec.md section 9.2): one entry per pair the request would have
needed, each measured, rejected, or not yet attempted. When the current
failure carries this field, the band swaps its lede to "The run stopped
before finishing. Pairs measured before that are shown below." and the
per-pair table renders one row per entry instead of the empty placeholder:

| Entry status | Row shows |
| --- | --- |
| `passed` | the same four measurements a successful pair's row would, and an "accepted" verdict |
| `failed` | whatever that pair's own rejection measured (never a fabricated 0 for a number never computed), a "rejected" verdict, and that pair's own message |
| `not_processed` | `—` in every measurement column and a "not processed" verdict — gate 7 is fail-fast (docs/backend-spec.md section 3), so a pair after the one that failed was never run |

The six KPI cells stay `—`: an aggregate over an incomplete run would silently
average in the pairs that were never measured, which is worse than admitting
nothing aggregate is available yet. A failure with no `partial_diagnostics`
(gate 0-5, or an old response) renders the ordinary empty band. Because
`result` is `null` on every failed run (docs/ui-spec.md section 4's state
machine), a failure immediately after a successful run never shows that
run's numbers alongside or underneath the new failure's evidence.

### 6.6 The feature survival funnel

`components/Diagnostics/FeatureSurvivalFunnel.tsx`. The KPI strip gives the
totals; the funnel shows how they shrink from stage to stage: how many
keypoints survive the ratio test, and how many of those matches RANSAC then
keeps as inliers.

Outside `complete`, including a failed run that carries
`partial_diagnostics`, the card keeps its head and shows "Filled in after a
successful stitch run." with no digit (A15).

The layout switches on the `(max-width: 960px)` media query, the same
breakpoint as the workspace:

- **above 960px, flow.** Three columns headed "Keypoints by frame (points)",
  "Matching filter outcome (matches)", and "RANSAC alignment status
  (consensus)", with SVG ribbons between them that are
  `clamp(3, √value × 0.48, 26)` px thick. Hovering a ribbon or a node dims the
  others and shows the ribbon's label in a tooltip that follows the pointer.
  A footer reads "Pipeline Consensus: {n} frames aligned into a {W} × {H} px
  panorama." above four metrics: Total Keypoints, Ratio-Passed, Lowest Inlier
  Ratio, and Worst Reproj. Error. The latter two name the one-based pair they
  came from ("· pair {k}"), the first pair winning a tie, and read "—" when
  the run has no pairs.
- **960px and below, compact funnel.** A purpose-built layout, not a squeezed
  copy of the flow: three stacked stages (Keypoints extracted, Passed Lowe's
  ratio, RANSAC inliers) joined by drop-off chips (`−{n} discarded · {p}%`,
  `−{n} outliers · {p}%`), a line reading "{inliers} of {keypoints}
  keypoints survived · {p}%", a collapsible "Frames · {n}" list with one bar
  per frame, and three outcome chips: RANSAC inliers, Anchor frame, Outliers
  filtered.

"View as table" opens a modal dialog, a bottom sheet at 960px and below,
titled "Feature Triage & Alignment Metrics". It has one row per frame: Frame,
Raw Keypoints, Ratio Pass, Inliers, Inlier Ratio, Reproj. Error, and Status.
Row `i` reads pair `i`'s arrays, the pair from frame `i` to frame `i + 1`, so
the last frame's pair columns read `-`. It closes from its close button, a
click on the backdrop, or Escape; opening it moves focus to the close button,
and closing it returns focus to the "View as table" button.

| Screen element | Source |
| --- | --- |
| keypoints per frame, and their total | `keypoints_per_image`, and its sum |
| ratio-passed total | sum of `ratio_passed_matches_per_pair` |
| inliers total | sum of `inliers_per_pair` |
| anchor frame | `reference_index` |
| outliers | ratio-passed total minus inliers total, floored at 0 |
| discarded | keypoint total minus ratio-passed total, floored at 0 |
| drop-off and survival percentages | discarded over the keypoint total, outliers over the ratio-passed total, and inliers over the keypoint total |
| each frame's "passed" and "discarded" ribbons | **estimated**: the ratio-passed total split across frames in proportion to each frame's keypoints |
| "Filtered non-consensus points" ribbon | decorative; its value is the discarded count capped at 120 |
| Lowest Inlier Ratio, Worst Reproj. Error | minimum of `inlier_ratio_per_pair`, maximum of `reprojection_error_per_pair`, each naming its one-based pair; the first pair wins a tie, same rule as the KPI strip (section 6.1) |
| ratio-test labels' threshold ("≤ {t}", "> {t}") | the ratio threshold the run was submitted with, passed in by the caller; the response does not echo it, so the labels read with no number until it is |

The sums are the same numbers the KPI strip shows. Everything below them in
this table is computed in the browser. Discarded is a rough measure, because
a match joins keypoints from two frames and an interior frame takes part in
two pairs. The per-frame split is an illustration: the backend reports
ratio-passed matches per pair, not per frame. Section 13 records how these
rows depart from section 6.1.

## 7. The failed state

Every failure names what was measured and what was required. No distorted image
is ever shown in place of an error.

The error block is a card centred in the viewport (section 3.1) and renders
six things, in this order: the HTTP status and error code in mono as an
eyebrow, a heading naming the images involved when the code identifies a pair,
the backend `message`, a measured-value-vs-threshold list for the codes that
carry one (below), a row of context chips built from `detail.context`, and
the remedy list from section 7.1. The measurement list and the chip row are
each omitted when they have nothing to show.

The measurement list is the primary, human-phrased fact: one row per
measurable check the code carries (e.g. inliers, inlier ratio, reprojection
error), each showing the exact value measured against the exact threshold
used, ratios as a percentage and errors in px, and whether that row cleared
its own bar. `DISCONNECTED_IMAGES` reads its rows from the preserved `cause`
(docs/backend-spec.md section 9.3) rather than showing nothing. The context
chip row still renders every scalar field for inspection, with its key
humanized (underscores become spaces) rather than shown as a raw identifier
that is the *only* description of what happened — the measurement list above
it carries that job. A nested field (`cause`, `partial_diagnostics`) is never
rendered as a chip, since a flat key/value row cannot represent one without
turning it into `[object Object]`.

The heading names frames one-based, with the file name from the current
selection: `Frame {n} · {name}` for a code that names one image,
`Frames {n} · {name} and {n} · {name}` for a code that names a pair
(`frameLabel`, docs/integration-spec.md section 7.1). The `image` and `pair`
context chips render the same one-based numbers. The file list highlights the
row or rows an error names, whether or not it also fails the client's own
pre-flight checks.

### 7.1 Remedy text

Remedies are held in the frontend, keyed by error code. They are language and
product guidance, not measurement, so they can be reworded without a backend
change and without widening the error envelope.

The table below includes codes the pipeline does not emit yet. They are marked
as owed, and the slice that owes them is named. Every code in section 9 of
`docs/backend-spec.md` has a row here; a code in one and not the other is a
defect in whichever was changed last. Writing remedies only for the
codes that exist today would produce a table full of "your file is too large"
and nothing for the geometric failures that actually need advice.

| Code | Status | Owed by | Remedy |
| --- | --- | --- | --- |
| `TOO_FEW_IMAGES` | live | - | add at least two frames that overlap |
| `TOO_MANY_IMAGES` | live | - | remove frames until eight or fewer remain |
| `INVALID_STITCH_SETTINGS` | live | - | reset the detector and thresholds to defaults |
| `UNSUPPORTED_IMAGE_TYPE` | live | - | convert to JPG or PNG and retry |
| `EMPTY_IMAGE` | live | - | the named file has no bytes; re-export it |
| `IMAGE_TOO_LARGE` | live | - | downscale the named file below the stated limit |
| `TOTAL_UPLOAD_TOO_LARGE` | owed | task 07b | the whole upload is over the request limit; remove a frame or downscale before uploading |
| `SERVICE_BUSY` | live | - | another panorama is being stitched; the button unlocks when it's safe to try again, counting down from `context.retry_after_seconds` |
| `STITCH_TIMEOUT` | owed | task 07b | the run passed the time limit; retry with fewer frames, or switch to ORB for a faster pass |
| `DECODE_FAILED` | owed | task 07c | the named file is not readable as an image despite its extension; re-export it as JPG or PNG |
| `IMAGE_TOO_MANY_PIXELS` | owed | task 07c | the named frame is over the processing limit; downscale it before uploading |
| `NO_DESCRIPTORS` | owed | task 07d | the named frame has too little texture; try ORB, or re-shoot with more detail in view |
| `INSUFFICIENT_MATCHES` | owed | task 07e | the named pair barely shares any detail; raise the ratio test toward 0.85, or re-shoot with more overlap |
| `INSUFFICIENT_INLIERS` | owed | task 07f | context-dependent (below): named per `failed_checks`, never a blanket ratio/RANSAC/detector line |
| `EXCESSIVE_REPROJECTION_ERROR` | owed | this slice | the named pair aligns loosely across the whole frame; re-shoot holding the camera steadier |
| `DEGENERATE_HOMOGRAPHY` | owed | task 07f | context-dependent (below): named per `reason`, never a blanket RANSAC line |
| `DISCONNECTED_IMAGES` | owed | task 07g | leads with the preserved `cause`'s own remedy, then: remove the named frame or add a bridging frame |
| `CANVAS_TOO_LARGE` | owed | task 07h | the frames did not line up into a sensible shape; check that they are one continuous pan and re-shoot the odd frame |

**Context-dependent remedies.** Three rows above compute their remedy from
`context` instead of returning one fixed list, because which specific
condition failed changes what is actually worth trying — a single blanket
line recommending the ratio test, RANSAC, or a detector switch for every
instance of a code would often not address what was actually measured:

- `INSUFFICIENT_INLIERS` reads `failed_checks` and includes a remedy for each
  one present (`min_inliers`: re-shoot with more overlap; `min_inlier_ratio`:
  check for too little true overlap or a repeating pattern producing false
  matches). Both bars missing shows both remedies.
- `DEGENERATE_HOMOGRAPHY` reads `reason` and gives a remedy suited to that
  specific geometric failure (folding/over-scaling vs. under-spread points),
  never the same "lower RANSAC" line for all four reasons.
- `DISCONNECTED_IMAGES` reads its preserved `cause` (docs/backend-spec.md
  section 9.3) and leads with that pair's own remedy before the generic
  "remove or bridge" line, so the frame named is not just told it is
  isolated without being told why.

Each falls back to a short generic line when the context it needs is absent
(an older response), never to an empty remedy list.

The rows below are raised by the client itself, not the pipeline
(docs/integration-spec.md section 7.2). None of them identify a frame, so
their heading is the generic one.

| Code | Status | Raised by | Remedy |
| --- | --- | --- | --- |
| `UNEXPECTED_ERROR` | live | backend catch-all (500) | something went wrong on the server; try again, or try ORB or fewer frames |
| `NETWORK_ERROR` | live | a rejected `fetch` while the pill reads online | the connection dropped; check your internet connection and try again |
| `SERVER_UNREACHABLE` | live | a rejected `fetch` while the pill reads waking or offline | the server isn't reachable yet; wait for "Server online", then try again |
| `UPSTREAM_UNAVAILABLE` | live | a 502/503/504 with no JSON envelope | the server is starting up; wait a moment and try again |
| `UNKNOWN_ERROR` | live | any other response with no JSON envelope | the server sent an unexpected response; try again |
| `REQUEST_TIMEOUT` | task 08e | the client's own request timeout (section 8.1) | the server took too long to answer; try again with fewer frames, or switch to ORB |

An unrecognised code renders the backend `message` plus a single generic
remedy. An empty remedy area is never acceptable.

## 8. The scaffold state (removed)

While `/api/v1/stitch` returned 501, a valid request produced
`PIPELINE_NOT_IMPLEMENTED`, and the interface showed its own amber notice
instead of the failed state's coral treatment. `task-plans/07j` wired the real
pipeline into the route and removed the 501, so this state no longer exists in
the code; this section is kept only as a record of what used to be here.

## 9. Backend availability

Render Free suspends an idle service, and waking it takes tens of seconds. A
single health check at page load will report a sleeping backend as offline,
which is wrong, and a stitch request sent to a cold service will hang with no
explanation. This is the most likely way the live demo fails.

The status pill has four states and names only the server state, not its host.

| Pill | Condition |
| --- | --- |
| checking | first health request in flight |
| waking | health request failed or timed out, retries still in progress |
| online | health request succeeded |
| offline | retries exhausted |

The visible labels are `Connecting…`, `Server waking up…`, `Server online`,
and `Server offline` respectively. The intro cover (section 3.2) reads the
same availability and shows its own server line while it is up; checking and
waking both read as `WAKING SERVER` there.

Health is requested once at page load, which doubles as the warm-up ping, then
retried with backoff while the pill reads waking. Retries stop after a bounded
number of attempts, and the pill settles on offline.

Independently, when a stitch request has been in flight past the cold-start
threshold, the working state adds a line explaining that the free backend is
probably waking and that the first run after idle is slow. The threshold and the
retry bounds are named constants, not literals scattered through components.

## 10. Mock mode

Mock mode exists because the complete and failed states cannot be reached
against the real backend until the pipeline lands, and because pull requests
must carry visual evidence.

- enabled only by `npm run dev:mock`, which runs Vite in `mock` mode and defines
  `VITE_MOCK_API` as `"true"`. Plain `npm run dev` always uses the real API at
  `VITE_API_BASE_URL`. A production build with the mock flag set fails;
- when on, the API client returns fixtures instead of calling the network, and a
  state switcher appears, offering every state in section 4. The switcher is part
  of mock mode and never ships;
- real-response fixtures are generated by `make contract-snapshots`, committed
  under `src/fixtures/contract/`, shape-checked by both backend and frontend
  tests, and used to derive the success-with-overlay and insufficient-inliers
  fixtures. Hand-written fixtures remain only for states no real response can
  produce;

Required fixtures: a three-image success including the overlay fields from
section 6.2, a success without the overlay fields, an `INSUFFICIENT_INLIERS`
rejection, an `IMAGE_TOO_LARGE` rejection, and an unrecognised code.

## 11. Code structure

- `frontend/src/components/` holds one component per region of the mock: the
  control rail, the output canvas, and the diagnostics block, plus their parts.
  `IntroCover/` (section 3.2) sits beside them and is rendered by `App.tsx`
  over the whole page; `ExampleGallery/` (section 3.3) is a part of the
  control rail; `Diagnostics/FeatureSurvivalFunnel.tsx` (section 6.6) is a
  part of the diagnostics block;
- one hook, `useStitchRun`, owns the state machine, the request, and the result.
  Components receive state and callbacks. There is no second place where a
  boolean can disagree with the current state;
- `frontend/src/api.ts` keeps its current shape. Mock mode is a branch inside
  it, not a parallel client;
- interface slider ranges and retry bounds are named constants. Server-owned
  file limits and defaults come from `ClientConfig`, with one generated-snapshot
  `FALLBACK_CONFIG`; remedy text receives the same config instead of embedding
  policy numbers in JSX;
- colours, radii, and fonts are the section 2 tokens in
  `frontend/src/styles.css`. The stylesheet is split into comment-delimited
  blocks (tokens and base, shell, rail, stage, diagnostics), so slices that
  touch different regions do not conflict. The funnel's rules live in the
  diagnostics block. The intro cover and the sample gallery each carry their
  own stylesheet beside the component (`IntroCover.css`,
  `ExampleGallery.css`); the gallery's stylesheet uses the section 2 tokens.

## 12. Acceptance

Per state, with the fixture that drives it:

| # | Requirement |
| --- | --- |
| A1 | each of the seven states renders its own screen, and no two are visible at once |
| A2 | the working state shows no numeric timing |
| A3 | every value in the section 6.1 table renders from its named source |
| A4 | the inlier ratio and reprojection cards show the worst pair, not an average |
| A5 | the overlay toggle flips visibility and `aria-pressed`, and is absent when the overlay fields are missing |
| A6 | download produces the clean image under the section 6.3 filename |
| A7 | every code in the section 7.1 table renders its remedy, and an unknown code renders the generic one |
| A9 | the pill distinguishes waking from offline |
| A10 | the workspace stacks at 960px, the table scrolls inside its container, and the page never scrolls horizontally at 1440px, 960px, or 375px |
| A11 | keyboard reaches every control, and the `--accent` focus ring is visible on every surface |
| A12 | the production build contains neither the state switcher nor the fixtures |
| A13 | above 960px the control rail and the output panel have equal height in every state, and the rail's action footer sits at the rail's bottom |
| A14 | `--text`, `--muted`, and `--faint` reach 4.5:1 on `--surface`, `--surface-2`, and `--surface-3`, and `--accent-ink` reaches 4.5:1 on `--accent` |
| A15 | outside complete, with no `partial_diagnostics` to show, the diagnostics band renders its section 6.4 frame and no digit appears in any KPI value, table body, or timing row |
| A16 | fonts are served from the bundle, the built page requests no font CDN, and no v1 font family name remains in the frontend source |
| A17 | the detector is a radio group named "Feature detector", operable with arrow keys, and disabled while working or preparing |
| A18 | a failed run carrying `partial_diagnostics` (section 6.5) renders one per-pair row per entry with its own status, never a fabricated 0 for a `not_processed` pair, and the six KPI cells stay `—` |
| A19 | the failed-state measurement list (section 7) shows the exact measured value against the exact threshold, ratios as a percentage and errors in px, for every code that carries one |
| A20 | a failed run immediately after a successful one shows none of that prior run's numbers in the output panel or the diagnostics band |
| A21 | the intro cover renders its three title lines, shows the server line for online and for waking, and dismisses from the enter control, Space, or a touch swipe up whether the server is online or still waking (`IntroCover.test.tsx`) |
| A22 | the sample gallery shows every set without an expand step, loads a set in one click as a replacement for the selection, marks the loaded set, names each failure set's expected code for the selected detector, and turns a missing or non-image asset into a retryable error (`ExampleGallery.test.tsx`, `ControlRail.test.tsx`) |
| A23 | the survival funnel shows no digit without a result, renders the flow above 960px and the compact funnel at 960px and below, and opens its table in both layouts (`FeatureSurvivalFunnel.test.tsx`) |

Evidence required on every pull request that touches this UI: Vitest green,
screenshots of the states the change affects at 1440px, and the same states at
375px when the change touches layout.

## 13. Known gaps

The intro cover, the sample gallery, the survival funnel, and the
working-state stage display were merged before this document described them.
Where one of them broke a rule stated above, the departure was listed here
instead of being quietly accepted. Each row closes in one of two ways: the
code changes to meet the rule, or the rule is amended here with its reason.
The table below holds the gaps still open; closed gaps have moved to the list
that follows it.

| # | Part | Rule | Departure |
| --- | --- | --- | --- |
| G1 | funnel | 6.1: the frontend computes nothing except the listed sums and bar widths | differences, percentages, and a proportional per-frame split are computed in the browser (section 6.6) |
| G4 | funnel, intro cover | 2.1: components refer to tokens only, never to a hex value | the funnel's ribbons and styles and the intro cover's stylesheet use raw hex and `rgba` colours |
| G5 | intro cover | 2.3: motion is limited to the three working-state cues, and reduced motion stops every animation | the typewriter runs on `requestAnimationFrame`, so the global `prefers-reduced-motion` rule does not stop it. That rule does remove the curtain's transition, so `transitionend` never fires, and a dismissed cover stays in the DOM, invisible and `aria-hidden`, instead of leaving it |
| G6 | funnel | A11: the keyboard reaches every control | the flow's hover detail (dimming and tooltips) still works only with a pointer; its numbers are reachable through "View as table" instead |

### Closed

- **G2** (funnel showed a mean, not the worst pair): the flow's footer now
  shows the lowest inlier ratio and the worst reprojection error, each naming
  its one-based pair, matching the KPI strip's rule.
- **G3** (ratio-test labels were fixed at "≤ 0.75"): the labels now read the
  ratio threshold the run was submitted with, and read with no number when
  none is supplied.
- **G6, Escape half** (table dialog did not close on Escape): the dialog now
  closes on Escape as well as its close button and a backdrop click, moves
  focus to the close button on open, and returns focus to the "View as
  table" button on close.
- **G7** (invented per-stage progress on a timer): the ribbon gives every
  stage the same pending treatment for the whole request, and the working
  view no longer shows a numbered stage card or names a current stage.
- **G8** (Blend description named multiband blending): the description now
  reads "Feather blending across overlaps and trimming empty margins",
  matching `backend/app/cv/blending.py`.
