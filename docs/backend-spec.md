# Backend specification

This document is the single source of truth for the panorama service: its
request lifecycle, response contract, error catalogue, and settings. It is the
backend counterpart to `docs/ui-spec.md`.

`docs/mockups/backend-design.html` is the visual draft this specification grew
out of. Where the two disagree, this document wins. Section 1.2 lists every
disagreement so nobody has to diff them by eye.

Implementation is split across `task-plans/07a` through `task-plans/07j`, with
`task-plans/07-backend-pipeline.md` as the parent.

## 1. Scope

### 1.1 What this document owns

- the admission check and the ten request gates;
- the full success response, every diagnostics field and how it is computed;
- the overlay geometry the result UI draws;
- all current error codes, their HTTP status, and the `context` each carries;
- every setting, its default, its range, and what it protects;
- the golden fixtures and the numeric thresholds a slice must hit to merge;
- the live pipeline contract exposed by `POST /api/v1/stitch`.

Out of scope: frontend behaviour (`docs/ui-spec.md`), hosting configuration
(`docs/deployment-plan.md`), and why classical CV was chosen at all
(`docs/decision-log.md`).

### 1.2 What this supersedes

| Source | Superseded by this document |
| --- | --- |
| `docs/api-contract.md` | the whole file; it is now a pointer |
| `docs/cv-pipeline.md` | its diagnostics contract and acceptance numbers; the algorithmic rationale stays there |
| `docs/mockups/backend-design.html` | nine gates (now ten plus admission), fourteen error codes (now eighteen), ten settings (now twenty), `max_output_pixels` 25 MP (now 8 MP), a fixed input size (now a per-request budget), `seam_positions_x` as a single x per pair (now a two-point line) |

The mock carries a banner naming these. It is not regenerated in this pass;
`task-plans/07j` owns bringing it back in line once the pipeline is real.

### 1.3 What the service still is

One stateless FastAPI process. It validates an upload, runs a classical OpenCV
pipeline in memory, and answers with a panorama plus the geometric numbers that
prove the alignment happened. No database, no object store, no file ever
written to disk.

## 2. System view and layer contract

```text
browser ──POST multipart──▶ FastAPI (Render Free, one uvicorn worker)
                              │
                              ├─ api/routes.py      admission + gates 0-3
                              ├─ services/stitcher  gate 4, orchestration, timing
                              └─ cv/*               gates 5-9, numpy only
                              │
browser ◀──200 JSON────────── image data URL + diagnostics
```

Each layer has one job and one prohibition. Reviews check the prohibition
column first.

| Layer | Owns | Must never |
| --- | --- | --- |
| `api/routes.py` | Admission, file count, media types, byte limits, settings parsing, error envelopes | Import `cv2` or touch pixel data |
| `services/stitcher.py` | Decode, downscale, stage ordering, diagnostics aggregation, timing, request-scoped cleanup | Know about HTTP, status codes, or multipart |
| `cv/features.py` | Detector construction, keypoints and descriptors for one image | Decide image order or the reference frame |
| `cv/matching.py` | KNN matching, distance metric per detector, Lowe ratio filtering | Estimate geometry or reject a pair |
| `cv/homography.py` | RANSAC estimation, inlier mask, reprojection error | Warp anything |
| `cv/pipeline.py` | Chain construction, reference choice, transform composition | Contain stage math of its own |
| `cv/warping.py` | Canvas bounds, perspective warp, seam line projection | Blend or crop |
| `cv/blending.py` | Valid masks, exposure compensation, feather seam, border crop, encode | Hide a bad alignment behind a soft seam |
| `core/config.py` | Every threshold and limit, read from the environment once | Be bypassed by a literal in route or stage code |

`cv/pipeline.py` is owned by member A, not B. Ordering decides from pairwise
match scores, which are member A's output. `docs/contribution-plan.md` records
this.

## 3. Request lifecycle

Admission runs first, then ten gates. Each gate either passes the request down
or exits with a named code. Cheap gates run before anything large is decoded.

| Step | Layer | Checks | Exit codes |
| --- | --- | --- | --- |
| admission | routes | a stitch slot is free | `SERVICE_BUSY` |
| gate 0 | routes | total request bytes | `TOTAL_UPLOAD_TOO_LARGE` |
| gate 1 | routes | file count in `[2, max_upload_files]` | `TOO_FEW_IMAGES`, `TOO_MANY_IMAGES` |
| gate 2 | routes | media type, non-empty, per-file bytes | `UNSUPPORTED_IMAGE_TYPE`, `EMPTY_IMAGE`, `IMAGE_TOO_LARGE` |
| gate 3 | routes | detector and threshold parsing | `INVALID_STITCH_SETTINGS` |
| gate 4 | services | decode, pixel ceiling, downscale to budget | `DECODE_FAILED`, `IMAGE_TOO_MANY_PIXELS` |
| gate 5 | cv/features | descriptors exist per image | `NO_DESCRIPTORS` |
| gate 6 | cv/matching | ratio-passed matches per pair | `INSUFFICIENT_MATCHES` |
| gate 7 | cv/homography | inliers, inlier ratio, reprojection error, non-degenerate H | `INSUFFICIENT_INLIERS`, `DEGENERATE_HOMOGRAPHY` |
| gate 8 | cv/pipeline, cv/warping | every image reachable, canvas within budget | `DISCONNECTED_IMAGES`, `CANVAS_TOO_LARGE` |
| gate 9 | cv/blending | blend, crop, encode | none |

The whole of gates 4 through 9 runs under one deadline. Exceeding it exits with
`STITCH_TIMEOUT`; see section 4.

### 3.1 Media type is a claim, not a fact

Gate 2 reads the multipart `Content-Type` header, which the client writes and
can lie about. It is a cheap filter, not a guarantee. The real check is gate 4,
where a decode either produces an array or raises `DECODE_FAILED`. Do not add
magic-byte sniffing to gate 2: it duplicates gate 4 and buys nothing, because a
file that sniffs correctly can still fail to decode.

## 4. Concurrency, timeouts, and the cancellation limit

Render Free runs one uvicorn worker on a fraction of a CPU. Three consequences
are designed for rather than discovered during the demo.

**OpenCV must not run on the event loop.** The stitch handler is a plain `def`,
so FastAPI dispatches it to the threadpool. A blocking `cv2` call inside an
`async def` would stall the worker, and `/healthz` would stop answering while a
stitch was in flight. Render would read that as a dead service and restart it.

**One stitch at a time.** A semaphore of `max_concurrent_stitches` guards the
pipeline. When it is full the request exits immediately with `SERVICE_BUSY`
(503) rather than queueing. In a lecture hall a 200 ms "the service is busy" is
worth more than a 30 s wait for the same answer.

**The deadline cannot cancel the work.** `STITCH_TIMEOUT` (504) is returned to
the client after `stitch_timeout_seconds`, but Python cannot interrupt a
running `cv2` call in a worker thread. That thread keeps consuming CPU until
the stage finishes. The timeout protects the client's patience, not the
server's CPU. This is a known limitation of the design and is the reason the
input budget in section 5 exists: the real defence against a runaway request is
never starting one.

`/healthz` never imports or calls `cv2`, so a cold instance answers as soon as
the process is up.

## 5. Input budget

### 5.1 Three ceilings before a decode

| Ceiling | Setting | Gate |
| --- | --- | --- |
| bytes per file | `max_upload_mb` | 2 |
| bytes per request | `max_total_upload_mb` | 0 |
| decoded pixels per image | `max_image_pixels` | 4 |

Gate 0 exists because the per-file limit alone permits `max_upload_files` times
`max_upload_mb` of raw bytes, which at the defaults is 96 MB on a 512 MB
instance before a single array is allocated.

### 5.2 Every image is downscaled, and the budget depends on how many there are

Images are always resized so their long edge fits a per-request budget. A fixed
size cannot work: the canvas grows with image count, so a size that is safe for
three images produces a canvas that fails gate 8 for eight.

The budget is derived once per request, before decoding, from the output
ceiling:

```python
OVERLAP_ADVANCE = 0.70   # fraction of a frame's width each new frame adds
BOW_ALLOWANCE   = 1.15   # vertical growth allowed for perspective
NOMINAL_ASPECT  = 4 / 3

def input_long_edge_budget(n: int, settings: Settings) -> int:
    modelled = math.sqrt(
        settings.max_output_pixels
        * settings.canvas_budget_fraction
        * NOMINAL_ASPECT
        / (BOW_ALLOWANCE * (OVERLAP_ADVANCE * n + (1 - OVERLAP_ADVANCE)))
    )
    return int(min(settings.input_long_edge_cap,
                   max(settings.input_long_edge_floor, modelled)))
```

At the defaults:

| Images | Long edge | Modelled canvas | Canvas MP |
| --- | --- | --- | --- |
| 2 | 1600 | 2720 x 1380 | 3.8 |
| 3 | 1600 | 3840 x 1380 | 5.3 |
| 4 | 1498 | 4644 x 1292 | 6.0 |
| 5 | 1353 | 5141 x 1167 | 6.0 |
| 6 | 1243 | 5593 x 1072 | 6.0 |
| 7 | 1156 | 6011 x 997 | 6.0 |
| 8 | 1085 | 6401 x 936 | 6.0 |

`canvas_budget_fraction` is 0.75, so a normal pan lands at 6 MP against an 8 MP
rejection ceiling. The 25 percent headroom is what makes `CANVAS_TOO_LARGE`
mean "this alignment is wrong" rather than "you uploaded too many photos".

Resizing only ever shrinks. An image already inside the budget passes through
with a scale factor of 1.0.

The tradeoff is stated plainly because the UI has to state it too: more frames
buys a wider panorama at a lower resolution. `/api/v1/config` publishes the
whole table so the interface can say so before the upload, not after.

### 5.3 Reported numbers live in processed space

Keypoint counts, reprojection errors, canvas dimensions, the encoded image, and
every overlay coordinate are expressed in the resolution the pipeline actually
worked at. Nothing is rescaled back to the uploaded resolution, because a
reprojection error rescaled to a space where no measurement happened is a
number nobody computed.

The mapping back is published instead: `source_dimensions`,
`processed_dimensions`, and `input_scale_factor`, one entry per image.

## 6. Endpoints

### 6.1 `GET /healthz`

Render's probe and the frontend's status pill. Never touches OpenCV.

```json
{ "status": "ok", "service": "automatic-panorama-api", "environment": "production" }
```

### 6.2 `GET /api/v1/config`

Server policy, so the interface stops guessing. Nine fields, each with a named
consumer. A setting with no consumer is not published, because everything
published is something we then have to keep.

| Field | Type | Read by |
| --- | --- | --- |
| `max_upload_files` | int | upload rail, the "n of 8" counter |
| `max_upload_mb` | int | per-file rejection message before upload |
| `max_total_upload_mb` | int | the running byte total in the upload rail |
| `default_detector` | `"SIFT" \| "ORB"` | detector control's initial value |
| `ratio_threshold` | float | ratio slider's initial value and reset |
| `ransac_reproj_threshold` | float | RANSAC slider's initial value and reset |
| `min_inliers` | int | per-pair table, to colour a marginal pair |
| `min_inlier_ratio` | float | per-pair table and the inlier-ratio card |
| `max_input_long_edge_by_count` | object, count to px | resolution notice shown as frames are added |

```json
{
  "max_upload_files": 8,
  "max_upload_mb": 12,
  "max_total_upload_mb": 48,
  "default_detector": "SIFT",
  "ratio_threshold": 0.75,
  "ransac_reproj_threshold": 5.0,
  "min_inliers": 12,
  "min_inlier_ratio": 0.25,
  "max_input_long_edge_by_count": {
    "2": 1600, "3": 1600, "4": 1498, "5": 1353,
    "6": 1243, "7": 1156, "8": 1085
  }
}
```

### 6.3 `POST /api/v1/stitch`

`multipart/form-data`.

| Field | Type | Default | Constraint |
| --- | --- | --- | --- |
| `files` | repeated file | required | 2-8 raster images, each within `max_upload_mb`, total within `max_total_upload_mb` |
| `detector` | string | `SIFT` | `SIFT` or `ORB`, case-insensitive |
| `ratio_threshold` | float | `0.75` | exclusive 0-1 |
| `ransac_reproj_threshold` | float | `5.0` | greater than 0, at most 50 |

Omitted optional fields fall back to the server default, not to a literal in
the route.

## 7. Success response

HTTP 200, `application/json`.

```json
{
  "status": "complete",
  "image": {
    "data_url": "data:image/png;base64,...",
    "mime_type": "image/png",
    "width": 3840,
    "height": 1380
  },
  "diagnostics": {
    "detector": "SIFT",
    "image_count": 3,
    "image_order": [0, 1, 2],
    "reference_index": 1,
    "input_long_edge_budget": 1600,
    "source_dimensions": [[4032, 3024], [4032, 3024], [4032, 3024]],
    "processed_dimensions": [[1600, 1200], [1600, 1200], [1600, 1200]],
    "input_scale_factor": [0.3968, 0.3968, 0.3968],
    "keypoints_per_image": [812, 765, 930],
    "candidate_pair_count": 2,
    "ratio_passed_matches_per_pair": [146, 128],
    "inliers_per_pair": [101, 87],
    "inlier_ratio_per_pair": [0.69, 0.68],
    "reprojection_error_per_pair": [1.42, 1.88],
    "output_width": 3840,
    "output_height": 1380,
    "stage_timings_ms": {
      "decode": 31.2, "features": 418.5, "matching": 12.3,
      "homography": 4.8, "warp": 96.4, "blend": 83.7, "encode": 40.1
    },
    "seam_lines": [
      { "top": [1104.0, 0.0], "bottom": [1118.0, 1380.0] },
      { "top": [2216.0, 0.0], "bottom": [2201.0, 1380.0] }
    ],
    "sample_correspondences_per_pair": [
      [{ "from": [742.0, 470.0], "to": [864.0, 508.0] }],
      [{ "from": [1544.0, 486.0], "to": [1672.0, 528.0] }]
    ]
  }
}
```

### 7.1 Field definitions

Nothing below is left to the implementer's judgement. A field whose formula is
not pinned here will be computed two different ways by two different slices.

| Field | Definition |
| --- | --- |
| `image.data_url` | PNG only, base64. See 7.4 |
| `image.width` / `height` | equal to `output_width` / `output_height`; duplicated so the download button needs only `image` |
| `image_count` | number of files that passed gate 4 |
| `image_order` | the order the chain was built in. Identity in v1. See 7.2 |
| `reference_index` | index into `image_order` of the frame all transforms compose into |
| `input_long_edge_budget` | the value section 5.2 produced for this request |
| `source_dimensions` | `[w, h]` per image as decoded, before resize |
| `processed_dimensions` | `[w, h]` per image after resize |
| `input_scale_factor` | `processed_long_edge / source_long_edge` per image, 1.0 when untouched |
| `keypoints_per_image` | detected keypoints, in processed space |
| `candidate_pair_count` | scalar; pairs that passed gate 6 into RANSAC |
| `ratio_passed_matches_per_pair` | matches surviving Lowe's ratio test |
| `inliers_per_pair` | `sum(inlier_mask)` from `cv2.findHomography` |
| `inlier_ratio_per_pair` | `inliers / ratio_passed_matches` for that pair. See 7.3 |
| `reprojection_error_per_pair` | median symmetric transfer error over inliers only, in processed pixels. See 7.3 |
| `output_width` / `output_height` | final canvas after the border crop |
| `stage_timings_ms` | wall-clock per stage, floats. Seven keys today; a client renders an unknown key rather than dropping it |
| `seam_lines` | optional. See section 8 |
| `sample_correspondences_per_pair` | optional. See section 8 |

### 7.2 Per-pair arrays and how they are indexed

v1 builds a chain in upload order and picks the middle frame as the reference.
Every per-pair array therefore has exactly `image_count - 1` entries, and entry
`i` describes the pair of images `(image_order[i], image_order[i + 1])`.

All per-pair arrays are the same length, always. A pair that fails gate 7 does
not produce a shorter array, it produces an error response.

`image_order` is identity in v1 and is still part of the contract, so automatic
ordering can land later without changing the response shape. Upload order is
capture order, and the interface tells the user so; see `docs/ui-spec.md`
section 1.

`reference_index` is `len(image_order) // 2`. Composing outward from the middle
halves the worst-case accumulated distortion compared with anchoring on the
first frame.

### 7.3 The two formulas that would otherwise be guessed

**Inlier ratio.** The denominator is the ratio-passed match count, not the raw
match count. The UI prints both numbers in adjacent columns of the per-pair
table, and a reader must be able to divide one by the other and get the
published ratio.

**Reprojection error.** For each inlier correspondence `(p, q)`:

```text
e = 0.5 * ( ||H·p − q||₂ + ||H⁻¹·q − p||₂ )
```

The reported value is the **median** of `e` over the inliers of that pair.
Median rather than mean because RANSAC has already discarded outliers, and the
inliers that remain cluster at the threshold edge, where a mean is dragged
around by the few worst survivors. Inliers only, because including rejected
matches would measure the matcher, not the transform.

### 7.4 Transport

PNG only. JPEG is not offered as an alternate download; a half-built second
format is worse than one format that is right.

The output ceiling is 8 MP rather than the 25 MP in the mock because the image
travels as base64 inside JSON. At 8 MP a photographic PNG is roughly 8 to 12 MB,
so the base64 field is roughly 11 to 16 MB, which one free instance can hold
alongside its working arrays and one browser can parse. At 25 MP the same field
reaches 30 to 80 MB and neither is true.

If profiling later forces a binary response with a diagnostics sidecar, the
logical fields above do not change, but `docs/ui-spec.md` sections 6.1 and 6.3
change with it. That is a contract change, not an optimisation.

## 8. Overlay geometry

Two optional diagnostics fields let the result UI draw its evidence overlay.
Both are in output-canvas pixel coordinates, the same space as `image.width`
and `image.height`, so the client applies no transform of its own. Keeping the
matrix arithmetic on the server is what the layer contract requires.

**`seam_lines`** — one entry per pair, each `{ "top": [x, y], "bottom": [x, y] }`.
The two points are the shared image boundary between that pair's frames,
projected onto the output canvas: the vertical edge of the earlier frame that
faces the later frame's projected centre. That is the right edge for a
left-to-right pan and the left edge for a right-to-left pan; always taking the
right edge would put a right-to-left seam on the panorama's outer border.

This replaces the mock's `seam_positions_x`, which sent a single x per pair. A
single x is only correct when the homography is a pure horizontal translation.
Under real perspective the shared boundary tilts, and it tilts further the
further a frame sits from the reference. Drawing a vertical line where the seam
is not is a picture that contradicts the measurement it is supposed to
illustrate, which defeats the entire purpose of the overlay. Projecting two
points instead of one costs a single extra matrix multiply.

**`sample_correspondences_per_pair`** — per pair, at most 12 inlier
correspondences, each `{ "from": [x, y], "to": [x, y] }` on the output canvas.
The field is named `sample` because it is a drawn illustration. Nothing may
count these points or report their number as a measurement. The inlier count is
`inliers_per_pair` and nowhere else.

Both fields are optional. A client that receives a response without them
renders the panorama with no overlay and no disabled control.

## 9. Error catalogue

Every failure is:

```json
{
  "detail": {
    "code": "INSUFFICIENT_INLIERS",
    "message": "Images 2 and 3 do not have enough geometric agreement.",
    "context": { "pair": [1, 2], "pair_index": 1, "inliers": 5, "required": 12, "inlier_ratio": 0.26 }
  }
}
```

The code is stable and machine-readable. The message is written for a person
and may be reworded freely. The `context` carries the measurement that failed,
so the interface can show what was measured against what was required without
parsing the message.

Indices in `context` are zero-based; messages are one-based, because the
interface counts frames the way a person does.

| Code | HTTP | Gate | Context keys | Message to the user |
| --- | --- | --- | --- | --- |
| `SERVICE_BUSY` | 503 | admission | `retry_after_seconds` | The service is stitching another panorama. Try again shortly. |
| `TOTAL_UPLOAD_TOO_LARGE` | 413 | 0 | `total_mb`, `limit_mb` | The upload total exceeds the n MB request limit. |
| `TOO_FEW_IMAGES` | 400 | 1 | `received`, `required` | Upload at least two overlapping images. |
| `TOO_MANY_IMAGES` | 400 | 1 | `received`, `limit` | Upload no more than eight images. |
| `UNSUPPORTED_IMAGE_TYPE` | 400 | 2 | `image`, `content_type` | File n is not a supported raster image. |
| `EMPTY_IMAGE` | 422 | 2 | `image` | File n is empty. |
| `IMAGE_TOO_LARGE` | 413 | 2 | `image`, `size_mb`, `limit_mb` | File n exceeds the 12 MB limit. |
| `INVALID_STITCH_SETTINGS` | 422 | 3 | `field`, `value` | Detector and geometric thresholds are invalid. |
| `DECODE_FAILED` | 422 | 4 | `image` | File n could not be read as an image. |
| `IMAGE_TOO_MANY_PIXELS` | 422 | 4 | `image`, `pixels`, `limit` | File n is above the 50 MP processing limit. |
| `NO_DESCRIPTORS` | 422 | 5 | `image`, `keypoints`, `detector` | Image n has too little texture for this detector. |
| `INSUFFICIENT_MATCHES` | 422 | 6 | `pair`, `pair_index`, `matches`, `required` | Images a and b share too few descriptor matches. |
| `INSUFFICIENT_INLIERS` | 422 | 7 | `pair`, `pair_index`, `inliers`, `required`, `inlier_ratio` | Images a and b do not have enough geometric agreement. |
| `DEGENERATE_HOMOGRAPHY` | 422 | 7 | `pair`, `pair_index`, `reason` | The transform between a and b collapses the image. |
| `DISCONNECTED_IMAGES` | 422 | 8 | `image` | Image n shares no view with the others. |
| `CANVAS_TOO_LARGE` | 422 | 8 | `pixels`, `limit`, `width`, `height` | The combined canvas exceeds the 8 MP output limit. |
| `STITCH_TIMEOUT` | 504 | 4-9 | `elapsed_seconds`, `limit_seconds` | Stitching took longer than the service allows. |
| unexpected | 500 | any | none | An unexpected error occurred. |

`DEGENERATE_HOMOGRAPHY` `reason` is one of `non_finite`, `singular`,
`non_convex_quad`, `excessive_scale`.

Every code in this table has remedy text in `docs/ui-spec.md` section 7.1. A
code added to the pipeline without an entry in both places falls through to
generic remedy text, which is a defect, not a fallback.

## 10. Settings

Every threshold in the system is here, read from the environment once per
process. A magic number anywhere else is a review comment.

| Setting | Default | Range | What it protects |
| --- | --- | --- | --- |
| `app_env` | `development` | development, test, production | health payload and log verbosity |
| `backend_cors_origins` | `http://localhost:5173` | comma list | exact Vercel origin in production |
| `max_upload_files` | 8 | 2 - 12 | request duration on a free instance |
| `max_upload_mb` | 12 | 1 - 50 | per-file memory before decode |
| `max_total_upload_mb` | 48 | 4 - 200 | total request memory before decode |
| `max_image_pixels` | 50 MP | 0.1 - 50 MP | decode-bomb ceiling for original clients, before the normal input downscale |
| `max_output_pixels` | 8 MP | 0.1 - 40 MP | base64 payload and runaway canvases |
| `canvas_budget_fraction` | 0.75 | 0.25 - 1.0 | headroom between the input budget and rejection |
| `input_long_edge_cap` | 1600 | 480 - 4096 | upper bound of the per-request budget |
| `input_long_edge_floor` | 640 | 240 - 1600 | lower bound, so eight frames stay usable |
| `default_detector` | SIFT | SIFT, ORB | quality by default, speed on request |
| `detector_nfeatures` | 2000 | 200 - 20000 | feature-stage time and memory |
| `ratio_threshold` | 0.75 | exclusive 0 - 1 | Lowe's test; false matches per pair |
| `min_ratio_passed_matches` | 20 | 8 - 500 | the floor for entering RANSAC |
| `ransac_reproj_threshold` | 5.0 px | 0 - 50 | how sloppy an inlier may be |
| `min_inliers` | 12 | 4 - 500 | the floor below which a pair is rejected |
| `min_inlier_ratio` | 0.25 | 0 - 1 | catches a lucky fit on many bad matches |
| `max_reprojection_error` | 3.0 px | 0.5 - 20 | rejects a pair that fits loosely everywhere |
| `stitch_timeout_seconds` | 60 | 10 - 300 | client patience, not server CPU. See section 4 |
| `max_concurrent_stitches` | 1 | 1 - 4 | worker memory on a 512 MB instance |

Environment variable names are the setting name uppercased.

## 11. Standing rules

**Rule 01 — never return a distorted image instead of an error.** A warped mess
that technically renders cannot be graded and cannot be debugged. Reject, and
name the pair that failed. This is why `CANVAS_TOO_LARGE` rejects rather than
shrinking: an oversized canvas after the section 5 budget means the geometry is
wrong, and shrinking it would hide that behind an output that looks normal.

**Rule 02 — measure every stage, always.** Timings and inlier counts are
collected on the success path too, not only when something fails. The report is
written from them.

**Rule 03 — nothing survives the request.** No globals, no temp files, no cache
keyed by upload. Render Free wipes local disk on restart and v1 is designed so
that costs nothing.

**Rule 04 — cheap checks run before expensive ones.** Total bytes, count, media
type, and per-file size are settled before a single image is decoded, so a bad
request never buys CPU time.

**Rule 05 — report the space you measured in.** Every published number is in
the resolution the pipeline worked at, with the scale factors alongside it. No
number is silently converted into a space where nothing was computed.

## 12. Golden fixtures and acceptance thresholds

`task-plans/07a` builds the fixture module every other slice tests against. It
lands first because a slice with no fixture has no way to prove anything.

### 12.1 Synthetic fixtures, generated in code

The primary fixtures are generated by the test, never committed as images. A
textured source plane is built with numpy, warped by a **known** homography,
and cropped into overlapping tiles. That gives ground truth, so a test can
assert how far the estimate sits from the right answer instead of only
asserting that nothing raised.

The generator provides, at minimum:

- a two-frame overlapping pair with known `H`;
- a three-frame chain with known pairwise transforms;
- a low-texture frame that must trigger `NO_DESCRIPTORS`;
- a repeated-texture frame that produces many ambiguous matches;
- two non-overlapping frames that must trigger `INSUFFICIENT_INLIERS`;
- a mixed-orientation set, one portrait among landscape frames;
- a set whose canvas would exceed `max_output_pixels`.

### 12.2 One real end-to-end fixture

A single small set of real photographs, downscaled, with its licence recorded
in `docs/demo-script.md`. Synthetic planes are too clean to expose exposure
differences and lens distortion. This set is for the end-to-end test and the
demo, not for unit tests.

### 12.3 Numbers a slice must hit to merge

| Fixture | Assertion |
| --- | --- |
| synthetic pair, SIFT | `inlier_ratio >= 0.60` |
| synthetic pair, SIFT | median reprojection error `<= 2.0` px |
| synthetic pair, SIFT | projected corner error against ground-truth `H` `<= 3.0` px |
| synthetic pair, ORB | `inlier_ratio >= 0.45`, corner error `<= 5.0` px |
| non-overlapping pair | raises `INSUFFICIENT_INLIERS`, never returns an image |
| low-texture frame | raises `NO_DESCRIPTORS` |
| three-frame chain | output within 5 percent of the modelled canvas size |
| real end-to-end set | 200 response, no black border wider than 2 px on any edge |

ORB is held to a looser bar than SIFT on purpose. Binary descriptors on a
synthetic plane genuinely perform worse, and a single shared threshold would
either fail ORB unfairly or let SIFT regress unnoticed.

Thresholds live in this table and in `backend/app/tests/conftest.py`, nowhere
else. Retuning one is a reviewed change to this document.

## 13. Merge history

Tasks 07a through 07i built and tested the pipeline stages. Task 07j wired the
service into `POST /api/v1/stitch`, assembled the response, and mapped pipeline
exceptions to the section 9 codes. The route is live; future work must preserve
the contract and thin-handler boundary documented above.

A feature flag was considered and rejected. It would add a second code path to
test for the six weeks the project has, and buys nothing that ordering the
merges does not already buy.
