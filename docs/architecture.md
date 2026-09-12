# Architecture

## Goal

Provide a public, stateless web app that accepts a small set of overlapping
photos, runs an explainable classical Computer Vision pipeline, and returns a
panorama plus evidence that the geometric estimation was robust.

## System view

```text
┌──────────────────────────┐        HTTPS / JSON + multipart        ┌────────────────────────────┐
│ React + TypeScript SPA   │ ─────────────────────────────────────▶ │ FastAPI on Render Free    │
│ Vercel                   │                                        │ validation + orchestration │
└─────────────┬────────────┘                                        └──────────────┬─────────────┘
              │                                                                    │
              │ result image + diagnostics                         OpenCV / NumPy │
              │                                                                    ▼
              │                                                       ┌────────────────────────────┐
              └────────────────────────────────────────────────────── │ CV pipeline               │
                                                                      │ SIFT/ORB -> match -> RANSAC │
                                                                      │ -> warp -> blend -> encode   │
                                                                      └────────────────────────────┘
```

The browser calls the public backend directly. Vercel does not proxy image
payloads and the backend does not rely on a database or object store.

## Component responsibilities

### Frontend (`frontend/src/`)

- Select and preview 2-8 images.
- Collect detector and threshold settings.
- Send `multipart/form-data` to `/api/v1/stitch`.
- Show progress, errors, the panorama, and diagnostics.
- Never run OpenCV or make algorithmic decisions.

### API (`backend/app/api/`)

- Validate file count, content types, and user-provided settings.
- Enforce request-size and image-count limits.
- Translate domain errors into stable JSON errors.
- Keep route handlers thin and free of OpenCV implementation details.

### Service orchestration (`backend/app/services/`)

- Decode validated uploads into arrays.
- Call the CV stages in a documented order.
- Aggregate output and diagnostics.
- Own request-scoped cleanup and response shaping.

### CV modules (`backend/app/cv/`)

Each module has one seam so the team can test and review it independently:

| Module | Responsibility |
| --- | --- |
| `features.py` | SIFT/ORB detector creation and keypoint/descriptor extraction |
| `matching.py` | KNN descriptor matching, distance selection, ratio test |
| `homography.py` | RANSAC estimation, inlier mask, reprojection diagnostics |
| `warping.py` | Transform composition, canvas bounds, perspective warp |
| `blending.py` | Valid masks, seam strategy, exposure handling, crop |
| `pipeline.py` | Multi-image ordering and stage orchestration |

## Target request lifecycle

1. Browser sends image files and `StitchSettings`.
2. API rejects malformed input before decoding large payloads.
3. Service decodes each image and normalizes color order.
4. Feature module extracts descriptors for each image.
5. Matcher compares overlapping candidates and applies the ratio test.
6. Homography module estimates a transform with RANSAC and rejects weak pairs.
7. Pipeline composes pairwise transforms around a reference image.
8. Warping module calculates the union canvas and warps images/masks.
9. Blending module creates a seam-aware panorama and crops empty borders.
10. Service encodes the result and returns diagnostics for the UI/demo.

## Data flow and contracts

The input/output shape is defined in [api-contract.md](api-contract.md). The
algorithm-specific acceptance rules are in [cv-pipeline.md](cv-pipeline.md).
No raw upload is persisted. Logs may contain request IDs and aggregate counts,
but never image bytes or user-provided filenames beyond what is needed for a
single response.

## Failure boundaries

| Failure | Response behavior |
| --- | --- |
| Wrong file type or too few images | `400` with field-level guidance |
| Image cannot be decoded | `422` with the affected index |
| No descriptors or too few good matches | `422` with a retry/change-input suggestion |
| Degenerate/weak Homography | `422` with inlier statistics |
| Render/output size too large | `413` or `422` with the configured limit |
| Unexpected server error | `500` with a request ID; details only in server logs |

The UI must never present an error response as a successful panorama.

## Security and privacy baseline

- CORS allows only explicit local and deployed frontend origins.
- Upload count, file size, and decoded pixel limits are configurable.
- Uploaded bytes are not written to disk by the v1 design.
- No credentials or private sample images belong in Git history.
- A future persistence feature requires a new data-retention decision.

## Scaling boundary

The assignment demo is intentionally synchronous and single-instance. A future
version could move the pipeline to a job worker and object store, but that would
add paid-service risk and obscure the end-to-end CV explanation. Do not add a
queue before profiling actual demo latency.
