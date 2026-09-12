# UI specification

The interface described here is the one drawn in `docs/mockups/ui-mock.html`.
That file is the visual reference: spacing, type scale, and component shape are
read from it and are not restated as numbers here. This document owns what the
mock cannot express — where every value on screen comes from, which state hides
what, which error code produces which sentence, and what has to be true before
a slice can merge.

Implementation is split across `task-plans/04a` through `task-plans/04e`. The
backend contract it reads from is `docs/backend-spec.md`; the overlay fields in
section 6.2 are owed by `task-plans/07h` and `task-plans/07i`.

## 1. Scope

In scope for v1:

- upload of 2-8 frames with previews and a running byte total;
- detector choice and two geometric thresholds;
- five screen states plus a cold-start state;
- the panorama, a toggleable seam/inlier overlay, and a PNG download;
- the diagnostics evidence block: summary cards, a per-pair table, and a stage
  timing chart;
- a mock mode that renders every state without a live backend.

Explicitly out of scope for v1, decided against the mock's own open list:

- drag-to-reorder frames. v1 chains the frames in upload order, so the order
  does matter, and the input rail says so in one line above the file list. A
  reorder control is a v2 affordance, not a v1 omission dressed up as a
  decision. `docs/backend-spec.md` section 7.2 has the ordering rule;
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

The checklist therefore shows all seven stages in a single pending treatment with
an indeterminate motion cue. The mock's per-stage ticks and millisecond values
are a picture of the finished run, not a live feed.

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

The overlay renders, per pair: a dashed aqua line from the seam's top point to
its bottom point, coral circles on both points of each sampled correspondence, a
faint connecting line between them, and a mono label reading the seam number and
the inlier count from `inliers_per_pair`. The label is anchored to the seam's
top point, so it follows a tilted seam instead of floating away from it.

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
| `INSUFFICIENT_INLIERS` | owed | task 07f | re-shoot the named frame with 30-50 percent overlap; raise the ratio test toward 0.80; try ORB on low-texture scenes |
| `DEGENERATE_HOMOGRAPHY` | owed | task 07f | the named pair produced an unusable transform; lower the RANSAC tolerance and re-shoot with less parallax |
| `DISCONNECTED_IMAGES` | owed | task 07g | the named frame shares no view with the others; remove it or add a bridging frame |
| `CANVAS_TOO_LARGE` | owed | task 07h | the frames did not line up into a sensible shape; check that they are one continuous pan and re-shoot the odd frame |

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
and `Server offline` respectively.

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
  control rail, the output canvas, and the diagnostics block, plus their parts;
- one hook, `useStitchRun`, owns the state machine, the request, and the result.
  Components receive state and callbacks. There is no second place where a
  boolean can disagree with the current state;
- `frontend/src/api.ts` keeps its current shape. Mock mode is a branch inside
  it, not a parallel client;
- interface slider ranges and retry bounds are named constants. Server-owned
  file limits and defaults come from `ClientConfig`, with one generated-snapshot
  `FALLBACK_CONFIG`; remedy text receives the same config instead of embedding
  policy numbers in JSX.

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
| A10 | the layout stacks at 900px and the table scrolls inside its container |
| A11 | keyboard reaches every control, and focus is visible on the dark ground |
| A12 | the production build contains neither the state switcher nor the fixtures |

Evidence required on every pull request that touches this UI: Vitest green, and
screenshots of the states the change affects.
