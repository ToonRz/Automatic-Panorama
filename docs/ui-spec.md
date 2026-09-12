# UI specification

The interface described here is the one drawn in `docs/mockups/ui-mock.html`.
That file is the visual reference: spacing, type scale, and component shape are
read from it and are not restated as numbers here. This document owns what the
mock cannot express — where every value on screen comes from, which state hides
what, which error code produces which sentence, and what has to be true before
a slice can merge.

Implementation is split across `task-plans/04a` through `task-plans/04e` and
depends on `task-plans/06-overlay-diagnostics-contract.md`.

## 1. Scope

In scope for v1:

- upload of 2-8 frames with previews and a running byte total;
- detector choice and two geometric thresholds;
- five screen states plus a cold-start state and a scaffold state;
- the panorama, a toggleable seam/inlier overlay, and a PNG download;
- the diagnostics evidence block: summary cards, a per-pair table, and a stage
  timing chart;
- a mock mode that renders every state without a live backend.

Explicitly out of scope for v1, decided against the mock's own open list:

- drag-to-reorder frames. `image_order` is decided by the server, and a
  draggable list would imply the user's order matters;
- a side-by-side match visualization tab. It needs correspondence data beyond
  what section 6 asks for;
- a light theme. The product is dark-committed.

## 2. Visual system

Tokens replace the current `frontend/src/styles.css` values with the mock's set.

| Token | Value | Meaning |
| --- | --- | --- |
| `--ground` | `#0a1421` | page background |
| `--ground-lift` | `#0e1a2b` | raised background |
| `--panel` | `#13243c` | panel surface |
| `--panel-soft` | `#1a2f4a` | inset surface |
| `--ink` | `#f3f0e8` | primary text |
| `--muted` | `#8ba0b9` | secondary text |
| `--line` | `rgba(243,240,232,0.13)` | border |
| `--line-soft` | `rgba(243,240,232,0.07)` | hairline |
| `--aqua` | `#6fe3cf` | accepted, complete, online |
| `--aqua-deep` | `#2f8d7e` | aqua on a filled surface |
| `--coral` | `#ff8469` | rejected, offline |
| `--amber` | `#efc96b` | running, waking, not yet built |

The colour rule is absolute and is what makes the screen readable at a glance:
aqua means a thing passed, amber means a thing is in motion or not yet real,
coral means a thing was rejected. No component may use these three colours
decoratively.

Three families are self-hosted as `woff2`, latin subset only, served from the
frontend bundle rather than a CDN. A cold Render backend already costs the demo
time; a font CDN is one more thing that can stall in a lecture hall.

| Role | Family | Cut | Fallback |
| --- | --- | --- | --- |
| display | Fraunces | variable, 300-600 | Georgia, "Times New Roman", serif |
| body | DM Sans | variable, 400-700 | "Avenir Next", Avenir, system-ui, sans-serif |
| numeric | JetBrains Mono | 400, 600 | ui-monospace, "SF Mono", Menlo, monospace |

Every measurement, count, ratio, error value, code, and uppercase label is set
in the mono family with tabular figures, so that columns of numbers align.

Fonts are licensed under the SIL Open Font License. The licence files ship
alongside the font files.

## 3. Layout

Two columns above 900px: the control rail on the left, the output canvas on the
right, with the diagnostics block spanning the full width underneath. At 900px
and below the canvas stacks under the rail and the diagnostics table scrolls
horizontally inside its own container rather than forcing the page to scroll.

## 4. States

The screen is driven by one state machine. The states are exclusive, and no
combination of booleans may produce a screen that is not one of these.

| State | Entered when | Canvas shows | Primary action |
| --- | --- | --- | --- |
| `empty` | fewer than 2 files chosen | placeholder and the pipeline ribbon | disabled, "Add two frames to start" |
| `ready` | 2-8 files chosen | placeholder and the pipeline ribbon | enabled, "Stitch panorama" |
| `working` | request in flight | stage checklist, section 5 | disabled, "Stitching..." |
| `complete` | HTTP 200 | panorama, overlay toggle, download | enabled, "Stitch again" |
| `failed` | HTTP 400, 413, 422, 500 | error block, section 7 | enabled, "Retry with ORB" when the detector was SIFT, otherwise "Try again" |
| `scaffold` | HTTP 501 | scaffold notice, section 8 | enabled, "Stitch panorama" |

Transitions out of a settled state:

- changing the detector or either threshold while in `complete` keeps the
  panorama on screen and marks it as produced by the previous settings. The
  state stays `complete`. Silently leaving the image under new settings would
  claim a result the numbers no longer describe, and clearing it would destroy
  the user's output because a slider moved;
- changing the file selection from any state clears the result and the error and
  returns to `empty` or `ready`. The old panorama does not describe the new
  frames;
- submitting from `complete`, `failed`, or `scaffold` clears the previous result
  before entering `working`.

The output panel carries `aria-live="polite"`. Entering `working` announces that
stitching started; entering `complete`, `failed`, or `scaffold` announces the
outcome heading. Stage-by-stage checklist changes are not announced, because a
screen reader reciting six stage names during every run is noise.

## 5. The working state

The checklist names the six pipeline stages in the order
`docs/cv-pipeline.md` implements them: decode, features, matching, homography,
warp, blend. It is an ordered list of what the request is doing, not a progress
report.

No per-stage timing, percentage, or elapsed counter is displayed while the
request is in flight. `POST /api/v1/stitch` returns once, at the end. The
frontend cannot know which stage the server is on, and animating a plausible
sequence would put invented numbers on screen. The real timings arrive in
`stage_timings_ms` and are rendered in the diagnostics chart once the response
lands.

The checklist therefore shows all six stages in a single pending treatment with
an indeterminate motion cue. The mock's per-stage ticks and millisecond values
are a picture of the finished run, not a live feed.

If the request has been in flight longer than the cold-start threshold in
section 9, the cold-start message appears below the checklist.

## 6. The complete state

### 6.1 Values on screen

Everything numeric is read from the response. Nothing is computed in the
frontend except the sums and the bar widths marked below.

| Screen element | Source |
| --- | --- |
| panorama image | `image.data_url` |
| output dimensions on the download button | `image.width`, `image.height` |
| header chip "SIFT / n frames / order" | `diagnostics.detector`, `image_count`, `image_order` |
| Keypoints card, total and per image | sum of `keypoints_per_image`, then the list |
| Ratio-passed card | sum of `ratio_passed_matches_per_pair`, then the list |
| Inliers card | sum of `inliers_per_pair`, then the list |
| Inlier ratio card | minimum of `inlier_ratio_per_pair`, labelled as the lowest pair |
| Reprojection card | maximum of `reprojection_error_per_pair`, labelled as the worst pair |
| Output card | `diagnostics.output_width`, `output_height`, megapixels, `image.mime_type` |
| per-pair table rows | one row per pair, index `i` reads element `i` of each per-pair array |
| stage chart bars | `stage_timings_ms`, bar width is the stage over the largest stage |
| chart total | sum of `stage_timings_ms` values |

The inlier ratio and reprojection cards deliberately show the worst pair rather
than an average. An average hides the one seam that is about to look wrong.

The per-pair table's verdict column is derived, not sent: a pair is accepted
when it appears in a successful response. A failed run has no table because it
has no successful pairs.

If `stage_timings_ms` contains a key the UI does not recognise, it is rendered
as an extra bar using the key as its label. The chart must not silently drop
measured time.

### 6.2 The seam and inlier overlay

The overlay is drawn as SVG on top of the panorama, in the panorama's own
coordinate space, so that it stays sharp when the image is scaled and so that
the toggle costs nothing. It requires two fields that the current API contract
does not provide; `task-plans/06-overlay-diagnostics-contract.md` owns adding
them, and `docs/api-contract.md` records them as pending.

Both fields are expressed in output-image pixel coordinates, the same space as
`image.width` and `image.height`, so the frontend can draw them without any
geometry of its own. Keeping the matrix arithmetic on the server matches the
rule that OpenCV work lives in `backend/app/cv/`.

- `seam_positions_x`: one x value per pair, the vertical line where that pair's
  images meet on the output canvas. Length equals the pair count.
- `sample_correspondences_per_pair`: for each pair, at most 12 inlier
  correspondences, each a pair of points on the output canvas. The field name
  says sample because it is a drawn illustration, not the inlier set. Nothing in
  the UI may count these points or present their number as a measurement. The
  inlier count comes from `inliers_per_pair` and nowhere else.

The overlay renders, per pair: a dashed aqua seam line, coral circles on both
points of each sampled correspondence, a faint connecting line between them, and
a mono label reading the seam number and the inlier count from
`inliers_per_pair`.

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

## 7. The failed state

Every failure names what was measured and what was required. No distorted image
is ever shown in place of an error.

The error block renders four things, in this order: a heading naming the images
involved when the code identifies a pair, the HTTP status and error code in
mono, the backend `message`, and a row of context chips built from
`detail.context`. Each chip shows its key and value. The chip row is omitted
when `context` is absent.

### 7.1 Remedy text

Remedies are held in the frontend, keyed by error code. They are language and
product guidance, not measurement, so they can be reworded without a backend
change and without widening the error envelope.

The table below includes codes the pipeline does not emit yet. They are marked
as owed, and the task that owes them is named. Writing remedies only for the
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
| `PIPELINE_NOT_IMPLEMENTED` | live | - | handled by section 8, not by this table |
| `INSUFFICIENT_INLIERS` | owed | task 02 | re-shoot the named frame with 30-50 percent overlap; raise the ratio test toward 0.80; try ORB on low-texture scenes |
| `NO_DESCRIPTORS` | owed | task 01 | the named frame has too little texture; try ORB, or re-shoot with more detail in view |
| `DEGENERATE_HOMOGRAPHY` | owed | task 02 | the named pair produced an unusable transform; lower the RANSAC tolerance and re-shoot with less parallax |
| `DISCONNECTED_IMAGES` | owed | task 02 | the named frame shares no view with the others; remove it or add a bridging frame |

An unrecognised code renders the backend `message` plus a single generic
remedy. An empty remedy area is never acceptable.

## 8. The scaffold state

While `/api/v1/stitch` returns 501, a valid request produces
`PIPELINE_NOT_IMPLEMENTED`. This is not the user's fault and not a rejection of
their images, so it does not use the failed state's coral treatment. It gets its
own amber state, states plainly that the stitching algorithm is not built yet,
and links to `docs/roadmap.md`.

This state is removed in the same pull request that replaces the 501 with a real
response, not before.

## 9. Backend availability

Render Free suspends an idle service, and waking it takes tens of seconds. A
single health check at page load will report a sleeping backend as offline,
which is wrong, and a stitch request sent to a cold service will hang with no
explanation. This is the most likely way the live demo fails.

The status pill has four states.

| Pill | Condition |
| --- | --- |
| checking | first health request in flight |
| waking | health request failed or timed out, retries still in progress |
| online | health request succeeded |
| offline | retries exhausted |

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

- enabled by a build-time flag, `VITE_MOCK_API`. It is off by default and must
  be off in the production build. A guard in the build or a check in the
  deployment task enforces this;
- when on, the API client returns fixtures instead of calling the network, and a
  state switcher appears, offering every state in section 4. The switcher is part
  of mock mode and never ships;
- fixtures live in one place and are the same objects the tests import. A
  fixture that drifts from what the tests assert is worse than no fixture.

Required fixtures: a three-image success including the overlay fields from
section 6.2, a success without the overlay fields, an `INSUFFICIENT_INLIERS`
rejection, an `IMAGE_TOO_LARGE` rejection, an unrecognised code, and the
`PIPELINE_NOT_IMPLEMENTED` response.

## 11. Code structure

- `frontend/src/components/` holds one component per region of the mock: the
  control rail, the output canvas, and the diagnostics block, plus their parts;
- one hook, `useStitchRun`, owns the state machine, the request, and the result.
  Components receive state and callbacks. There is no second place where a
  boolean can disagree with the current state;
- `frontend/src/api.ts` keeps its current shape. Mock mode is a branch inside
  it, not a parallel client;
- thresholds, retry bounds, file limits, and the remedy table are named
  constants in their own modules, not literals inside JSX.

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
| A8 | 501 renders the scaffold state, not the failed state |
| A9 | the pill distinguishes waking from offline |
| A10 | the layout stacks at 900px and the table scrolls inside its container |
| A11 | keyboard reaches every control, and focus is visible on the dark ground |
| A12 | the production build contains neither the state switcher nor the fixtures |

Evidence required on every pull request that touches this UI: Vitest green, and
screenshots of the states the change affects.
