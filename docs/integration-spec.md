# Integration and user-readiness specification

This document closes the gaps between the live backend (`docs/backend-spec.md`)
and the frontend (`docs/ui-spec.md`) so that a person with ordinary phone
photos can use the public site without knowing anything about the course, the
hosting provider, or the code.

It is written after `task-plans/07j` wired the real pipeline into
`POST /api/v1/stitch`. Nothing here changes the CV algorithm.

Implementation is split across `task-plans/08a` through `task-plans/08g`, with
`task-plans/08-integration-readiness.md` as the parent.

## 1. Scope

### 1.1 What this document owns

- which text a user may see, and the replacement copy for course and hosting
  text (section 3);
- how the frontend reads server policy from `GET /api/v1/config` (section 4);
- pre-flight validation before any upload (section 5);
- browser-side image preparation and the new backend pixel ceiling (section 6);
- how errors name frames, and remedies for every failure the client can reach
  (section 7);
- request timeout, cancel, and busy handling (section 8);
- dev-server defaults, the stage-key list, and the contract snapshots that stop
  the two sides drifting (section 9);
- public deployment and smoke evidence (section 10).

Out of scope: HEIC decoding on the server, Web Workers, automatic retries,
server-side cancellation, persistence, and translation of the interface.

### 1.2 What this supersedes

Each slice updates the superseded document in the same pull request, so the
older spec never contradicts this one after merge.

| Document | Section | Change | Slice |
| --- | --- | --- | --- |
| `docs/ui-spec.md` | 4 | adds the `preparing` state | 08c |
| `docs/ui-spec.md` | 5 | seven stages, including `encode` | 08f |
| `docs/ui-spec.md` | 7, 7.1 | frame naming; remedies for client-side codes | 08d |
| `docs/ui-spec.md` | 9 | status pill copy without the host name | 08a |
| `docs/ui-spec.md` | 10 | mock mode enabled by `--mode mock`, fixtures derived from snapshots | 08f |
| `docs/backend-spec.md` | 5.1, 9, 10 | `max_image_pixels` default 50 MP | 08c |
| `docs/backend-spec.md` | 1.1, 9 | `PIPELINE_NOT_IMPLEMENTED` row removed | 08a |
| `README.md`, `CLAUDE.md` | status | no longer describe a scaffold or a 501 | 08a |
| `docs/architecture.md`, `docs/deployment-plan.md` | 501 mentions | removed | 08a |
| `task-plans/05` | deployment bullets | moved to 08g; 05 keeps CI | 08g |

Course documents (`docs/assignment-alignment.md`, `docs/contribution-plan.md`,
`docs/demo-script.md`) stay. They are for the team, not for users.

## 2. Gap inventory

Every gap found in the audit, with the evidence and the slice that closes it.

| # | Gap | Evidence | Slice |
| --- | --- | --- | --- |
| G1 | course and host text on user-visible surfaces | `App.tsx` kicker, `index.html` meta, `EmptyState.tsx`, `StatusPill.tsx`, footer, generic remedy, FastAPI description | 08a |
| G2 | `README.md`, `CLAUDE.md`, and two docs still describe a scaffold and a 501 | `README.md` status block, `CLAUDE.md` "Project" | 08a |
| G3 | `/api/v1/config` is never called; limits and defaults are hard-coded | `constants/thresholds.ts`, `TOO_MANY_IMAGES` remedy says "eight" | 08b |
| G4 | no client-side check of count, per-file size, total size, or type before upload | `useStitchRun.submit` only checks count | 08b |
| G5 | a standard 12 MP phone photo (4032 x 3024 = 12.19 MP) fails `IMAGE_TOO_MANY_PIXELS` | `max_image_pixels = 12_000_000` | 08c |
| G6 | a phone original over 12 MB is rejected, although the server would shrink it to about 1600 px | `max_upload_mb = 12`, no client resize | 08c |
| G7 | HEIC files from iPhones fail with a server error instead of a clear message | backend media allow-list | 08c |
| G8 | errors and diagnostics use indices, never file names; `image_order` renders zero-based | `PairTable.tsx`, `Diagnostics.tsx` | 08d |
| G9 | `UNEXPECTED_ERROR`, `NETWORK_ERROR`, `UNKNOWN_ERROR`, and non-JSON proxy errors fall to a generic remedy that points at repository docs | `constants/remedies.ts` | 08d |
| G10 | `SERVICE_BUSY` remedy promises the button re-enables after a wait; nothing implements that | `remedies.ts`, `ControlRail.tsx` | 08d |
| G11 | a stitch request has no timeout and no cancel | `api.ts submitStitch` | 08e |
| G12 | `npm run dev` runs in mock mode on this machine, so the real backend is never exercised locally | `frontend/.env.development.local` | 08f |
| G13 | backend emits `encode` in `stage_timings_ms`; the frontend stage list does not know it | `constants/pipeline.ts` | 08f |
| G14 | fixtures are hand-written and never checked against a real response | `fixtures/index.ts` | 08f |
| G15 | `ErrorDetail.context` schema allows only scalars but real errors carry `pair` lists | `schemas/stitch.py` | 08f |
| G16 | no public deployment with an exact CORS origin and recorded smoke evidence | `task-plans/05` open | 08g |

## 3. User-facing copy (08a)

### 3.1 The rule

No surface a user can reach mentions the course code, semester, report,
grading, evidence for a report, the hosting provider, repository paths, or spec
section numbers. Surfaces are: rendered text in every screen state, `index.html`
metadata, the document title, alt text, `aria-*` labels, the OpenAPI title and
description, and error messages from the API.

Code comments and team documents are not surfaces and are not changed by this
rule.

### 3.2 Replacements

| Where | Now | Becomes |
| --- | --- | --- |
| `App.tsx` header kicker | `CP461 · Computer Vision · Semester 1 2026` | removed; the H1 and tagline stay |
| `index.html` meta description | `CP461 Automatic Panorama Stitcher - ...` | `Stitch overlapping photos into one panorama in your browser.` |
| `EmptyState.tsx` paragraph | `... for every image pair — the evidence the report asks for.` | `... for every image pair, so you can see why the frames lined up.` |
| `Diagnostics.tsx` kicker | `Evidence` | `Details` |
| `StatusPill.tsx` | `Checking backend…` / `Backend waking · Render free tier` / `Backend online · Render` / `Backend offline` | `Connecting…` / `Server waking up…` / `Server online` / `Server offline` |
| `WorkingState.tsx` cold-start note | `The free backend may be waking up — ...` | `The server may be waking up. The first run can take up to a minute.` |
| `App.tsx` footer | `Stateless v1 · no database, no stored uploads` + `Project docs ↗` | `Images are processed in memory and never stored.` only |
| `ControlRail.tsx` fineprint | `Frames are processed in memory. Nothing is stored.` | removed, the footer now says it once |
| `remedies.ts` generic remedy | `... check docs/backend-spec.md for updates.` | `Try again. If it keeps happening, try different photos or fewer frames.` |
| `main.py` FastAPI description | `CP461 FastAPI service for ...` | `Feature-matching panorama stitching service.` |

### 3.3 Guard

A frontend test renders every screen state (via fixtures) and fails if the DOM
text, `document.title`, or the `index.html` meta content matches
`/CP461|semester|report asks|render\b|docs\//i`. A backend test does the same
for `app.openapi()["info"]`.

## 4. Server policy in the client (08b)

### 4.1 Loading

A hook, `useClientConfig`, owns the config. It:

1. starts with `FALLBACK_CONFIG`, a single constant equal to the backend
   defaults in `docs/backend-spec.md` section 6.2, so the page is usable before
   the server answers;
2. requests `GET /api/v1/config` once the availability hook reports `online`
   (not before, so a sleeping server is not hit twice);
3. replaces the fallback with the response when it parses; on failure it keeps
   the fallback and does not retry until availability goes `online` again;
4. exposes `{ config, source: "fallback" | "server" }`. `source` is not shown
   to users; it is for tests.

`constants/thresholds.ts` keeps only interface choices that are not server
policy: slider min/max/step. `MAX_FILES`, `MAX_FILE_BYTES`, `RATIO_DEFAULT`,
and `RANSAC_DEFAULT` move into `FALLBACK_CONFIG` and are read from the config
everywhere else.

### 4.2 Consumers

| Field | Read by |
| --- | --- |
| `max_upload_files` | file counter `n / max`, pre-flight count check, `TOO_MANY_IMAGES` remedy |
| `max_upload_mb` | post-preparation per-file check, dropzone hint |
| `max_total_upload_mb` | post-preparation total check, upload total line |
| `default_detector` | detector initial value |
| `ratio_threshold` | ratio slider initial value |
| `ransac_reproj_threshold` | RANSAC slider initial value |
| `max_input_long_edge_by_count` | image preparation budget (section 6) |
| `min_inliers`, `min_inlier_ratio` | not consumed in this spec; left published |

Server defaults are applied to the sliders only while the user has not moved
them. A config that arrives after the user touched a control does not reset it.

### 4.3 Remedies read config

Remedy text becomes a function of `(detail, config)` so numbers in remedies
come from policy: `TOO_MANY_IMAGES` reads "Remove frames until
{max_upload_files} or fewer remain."

## 5. Pre-flight validation (08b)

Validation runs in the browser and never sends a request. Two levels, because
the size that matters is the size after preparation, not the original.

### 5.1 On selection

| Check | Rule | Result |
| --- | --- | --- |
| count | `files.length <= max_upload_files` | whole selection rejected; the rail shows "Choose up to {max} frames. You chose {n}." and keeps the previous selection |
| type | MIME in the accepted list, or the file decodes (section 6.3) | that file row is marked invalid |
| original size | `file.size <= CLIENT_MAX_ORIGINAL_MB` (60 MB) | that file row is marked invalid: "Too large to open in the browser." |

A new pick appends to the current selection, so the count check applies to the
combined list. A selection is never silently trimmed.

### 5.2 After preparation

| Check | Rule | Result |
| --- | --- | --- |
| per-file | prepared blob `<= max_upload_mb` | row marked invalid, reusing the `IMAGE_TOO_LARGE` wording |
| total | sum of prepared blobs `<= max_total_upload_mb` | the upload total line turns to an error, reusing `TOTAL_UPLOAD_TOO_LARGE` wording |

### 5.3 Effect on the button

Any invalid row, or a failed total, keeps the primary button disabled with the
label "Fix the marked frames". Invalid rows show their reason inline in the
file list. Pre-flight problems never enter the `failed` screen state: they are
the user's selection, not a run outcome.

## 6. Image preparation (08c)

### 6.1 When

Preparation starts as soon as a selection passes section 5.1, because the
budget depends only on the frame count, which is known at selection. A new
selection abandons any preparation in flight, using the same request-id guard
`useStitchRun` already uses.

This adds one screen state to `docs/ui-spec.md` section 4:

| State | Entered when | Output panel | Primary button |
| --- | --- | --- | --- |
| `preparing` | a valid selection is being prepared | the `ready` placeholder | disabled, "Preparing images…" |

`preparing` moves to `ready` when every frame is prepared and section 5.2
passes, or stays in `ready` with the button disabled per section 5.3 if it
fails.

### 6.2 Algorithm, per frame, sequentially

```text
budget = config.max_input_long_edge_by_count[String(n)]
bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
long   = max(bitmap.width, bitmap.height)

if long <= budget and file.type in BACKEND_ACCEPTED_TYPES:
    upload = file                         # unchanged bytes
else:
    scale  = min(1, budget / long)
    draw bitmap into a canvas of round(w * scale) x round(h * scale)
    upload = canvas.toBlob("image/jpeg", PREPARED_JPEG_QUALITY)   # 0.92
    upload name = original stem + ".jpg"

bitmap.close()
```

- `OffscreenCanvas` is used when available, otherwise a detached
  `HTMLCanvasElement`. No Web Worker.
- Frames are processed one at a time so no more than one full-resolution bitmap
  is alive.
- Alpha is discarded, matching the backend's `IMREAD_COLOR` decode.
- `BACKEND_ACCEPTED_TYPES` mirrors the route allow-list: JPEG, PNG, WEBP, BMP,
  TIFF.
- Resizing only ever shrinks.

### 6.3 Decode failure

If `createImageBitmap` throws, the row is marked invalid with
"{name} can't be read in this browser. Export it as JPG and add it again." This
covers HEIC in Chrome and Firefox. In Safari, HEIC decodes and follows the
re-encode path, so it works without special handling.

### 6.4 What the file list shows

Each row keeps the original name, and after preparation shows
`{origW}×{origH} → {uploadW}×{uploadH}` when resized, or `{w}×{h}` when not.
The upload total reflects prepared bytes.

### 6.5 Backend ceiling

`max_image_pixels` default changes from `12_000_000` to `50_000_000` (the top of
its existing range) in `core/config.py`, `backend/.env.example`, and
`render.yaml`. This covers clients that upload originals directly (48 MP and
50 MP sensors). `max_upload_mb` stays at 12.

Decoding one 50 MP image allocates about 150 MB; decode is sequential and the
full array is released after resizing, which fits a 512 MB instance at
`max_concurrent_stitches = 1`. A backend test uploads a synthetic image just
above 12 MP and gets a 200.

## 7. Errors that name frames (08d)

### 7.1 Frame labels

The client keeps the selection in upload order, which is the order the backend
indexes (`image` and `pair` in `context`, `image_order` in diagnostics). One
helper, `frameLabel(index, files)`, renders `Frame {index + 1} · {name}`.

| Surface | Now | Becomes |
| --- | --- | --- |
| error heading with `image` | `Frame 2 has too little texture` | `Frame 2 · IMG_4413.jpg has too little texture` |
| error heading with `pair` | `Frames 1 and 2 do not agree` | `Frames 1 · IMG_4412.jpg and 2 · IMG_4413.jpg do not agree` |
| context chips `image`, `pair` | zero-based raw values | one-based values |
| `Diagnostics` order line | `0 → 1 → 2` | `1 → 2 → 3` |
| `PairTable` pair cell | `0 → 1` | `1 → 2`, file names in the cell's `title` |
| file list | no link to errors | rows named by the error's `image` or `pair` get the invalid treatment |

The backend `message` is still shown under the heading, unchanged.

### 7.2 Remedies for client-reachable codes

These rows are added to `docs/ui-spec.md` section 7.1.

| Code | Status | Raised by | Remedy |
| --- | --- | --- | --- |
| `UNEXPECTED_ERROR` | 500 | backend catch-all | Something went wrong on the server. Try again; if it repeats, try ORB or fewer frames. |
| `NETWORK_ERROR` | 0 | `fetch` rejected while the pill is `online` | The connection dropped. Check your internet connection and try again. |
| `SERVER_UNREACHABLE` | 0 | `fetch` rejected while the pill is `waking` or `offline` | The server isn't reachable yet. Wait for "Server online", then try again. |
| `UPSTREAM_UNAVAILABLE` | 502, 503, 504 without a JSON envelope | a proxy page in front of a waking server | The server is starting up. Wait a moment and try again. |
| `UNKNOWN_ERROR` | any other non-envelope response | `parseError` returned nothing | The server sent an unexpected response. Try again. |
| `REQUEST_TIMEOUT` | 0 | section 8.1 | The server took too long to answer. Try again with fewer frames, or switch to ORB. |

Every code in `docs/backend-spec.md` section 9, plus every row above, has a
remedy. The generic remedy (section 3.2) is reached only by a code in neither.

### 7.3 `SERVICE_BUSY`

On `SERVICE_BUSY` the failed state renders as usual and the primary button is
disabled with the label `Try again in {s}s`, counting down from
`context.retry_after_seconds` once per second. At zero the button re-enables
with its normal failed-state label. There is no automatic retry. The remedy
becomes: "Another panorama is being stitched. The button unlocks when it's safe
to try again."

## 8. Request lifecycle (08e)

### 8.1 Timeout

The client aborts a stitch after

```text
STITCH_REQUEST_TIMEOUT_MS = COLD_START_ALLOWANCE_MS (45_000)
                          + stitch_timeout_seconds * 1000   (not in config: use 60_000)
                          + RESPONSE_MARGIN_MS (15_000)
                          = 120_000 at defaults
```

`stitch_timeout_seconds` is not published in `/config` and this spec does not
add it, so the 60 s term is a named client constant. An abort from timeout
enters `failed` with `REQUEST_TIMEOUT`.

### 8.2 Cancel

In `working`, a secondary "Cancel" button sits under the primary button. It
aborts the request through the same `AbortController`, returns to `ready` with
the selection and settings intact, and shows an inline note in the rail:
"Cancelled. The server may still be finishing that run, so the next try might
report busy for a moment." The note clears on the next submit or selection.

Cancel does not stop server work (`docs/backend-spec.md` section 4). A
`SERVICE_BUSY` immediately after cancel is expected and handled by section 7.3.

### 8.3 Late responses

A response that arrives after cancel, timeout, or a new selection is dropped by
the existing request-id guard. A test proves a late 200 does not overwrite the
`ready` state.

## 9. Dev mode and contract snapshots (08f)

### 9.1 Dev server

- `npm run dev` always talks to `VITE_API_BASE_URL` (default
  `http://localhost:8000`).
- `npm run dev:mock` runs `vite --mode mock`. `vite.config.ts` sets
  `import.meta.env.VITE_MOCK_API` to `"true"` only for that mode, so no ignored
  env file is needed.
- `vite build` fails if `VITE_MOCK_API === "true"` in production mode.
- `README.md` tells anyone with an old `frontend/.env.development.local` that
  sets `VITE_MOCK_API` to delete that line.

### 9.2 Stage keys

`constants/pipeline.ts` lists the seven keys the backend emits, in order:
`decode`, `features`, `matching`, `homography`, `warp`, `blend` ("Blend and
crop"), `encode` ("Encode PNG"). The working state and the stage chart both read
this list. An unknown key still renders as an extra row.

### 9.3 Snapshots

`backend/scripts/export_contract_snapshots.py` (target `make contract-snapshots`)
drives the real app through `TestClient` and writes, under
`frontend/src/fixtures/contract/`:

| File | Produced by |
| --- | --- |
| `config.json` | `GET /api/v1/config` at default settings |
| `stitch-success.json` | `POST /api/v1/stitch` with `end_to_end_fixture()` frames |
| `error-too-few-images.json` | one frame |
| `error-insufficient-inliers.json` | `non_overlapping_pair()` |

Normalization: `image.data_url` becomes a fixed 1x1 PNG data URL (width and
height kept); floats are rounded to 3 decimals; `stage_timings_ms` values are
kept. Files are pretty-printed with sorted keys so diffs stay readable.

`backend/app/tests/test_contract_snapshots.py` regenerates the payloads in
memory and fails unless every committed snapshot has the same key set at every
depth and the same JSON type at every leaf (number, string, boolean, null,
array, object). The failure message names the file and says to run
`make contract-snapshots`.

On the frontend, `src/fixtures/contract.test.ts` imports the snapshots, checks
them with a runtime shape guard written against `types.ts`, and renders the
`complete` and `failed` states from them. `successWithOverlayFixture` and
`insufficientInliersError` are derived from the snapshots.
`unrecognizedCodeError` and `successWithoutOverlayFixture` stay hand-written
because no real response produces them.

### 9.4 Error context schema

`ErrorDetail.context` in `schemas/stitch.py` widens to
`dict[str, str | int | float | list[int]] | None`, matching what the handlers
already emit.

## 10. Public deployment (08g)

- Backend on Render from `render.yaml`; `BACKEND_CORS_ORIGINS` set to the exact
  Vercel production origin plus `http://localhost:5173`.
- Frontend on Vercel with root `frontend/` and `VITE_API_BASE_URL` set to the
  Render URL; `VITE_MOCK_API` unset.
- `scripts/smoke_public.py <api-url>` checks `/healthz`, `/api/v1/config`, and a
  stitch of the synthetic three-frame set, and prints the diagnostics summary.
- A manual pass in a real browser on the public URL, recorded with screenshots:
  three 12 MP phone photos, one 48 MP photo set, one HEIC in Safari and in
  Chrome, a cold start after 15 minutes idle, and a cancel followed by an
  immediate retry.
- Public URLs and the commit they serve are recorded in
  `docs/deployment-plan.md`.

## 11. Acceptance

| # | Requirement | Slice |
| --- | --- | --- |
| I1 | the copy guard in section 3.3 passes for every screen state and the OpenAPI info | 08a |
| I2 | `README.md` and `CLAUDE.md` describe a working stitcher, and no doc still promises a 501 | 08a |
| I3 | changing `MAX_UPLOAD_FILES` on the server changes the counter, the count check, and the remedy without a frontend rebuild | 08b |
| I4 | a selection over the count limit, a non-image file, and an over-60 MB file are rejected without a network request | 08b |
| I5 | a 4032x3024 JPEG uploads at the budget size and stitches; a 20 MB original is accepted | 08c |
| I6 | a JPEG with EXIF orientation 6 is uploaded upright | 08c |
| I7 | an undecodable file is marked invalid in the list and never sent | 08c |
| I8 | the backend accepts a 12.19 MP upload | 08c |
| I9 | every error naming an image or pair shows one-based numbers and file names, and highlights those rows | 08d |
| I10 | every code in section 7.2 and backend section 9 renders a non-generic remedy | 08d |
| I11 | `SERVICE_BUSY` counts down and then re-enables the button, with no request sent during the countdown | 08d |
| I12 | a stitch that exceeds the client timeout lands in `failed` with `REQUEST_TIMEOUT` | 08e |
| I13 | cancel returns to `ready` with the note, and a late response is ignored | 08e |
| I14 | `npm run dev` performs a real network request; `npm run dev:mock` does not; a production build with the flag set fails | 08f |
| I15 | the stage chart shows seven known stages and no unknown row for a real response | 08f |
| I16 | changing a diagnostics key in the backend without regenerating snapshots fails the backend test | 08f |
| I17 | the public URL passes section 10's scripted and manual checks | 08g |
