# Automatic Panorama Stitcher

CP461: Introduction to Computer Vision - Semester 1/2026

An end-to-end Computer Vision application that turns two or more overlapping
photographs into one panorama. A React interface sends the frames to a live
FastAPI/OpenCV pipeline, which returns a stitched PNG together with the
alignment diagnostics behind it.

- **Web app:** <https://automatic-panorama.vercel.app>
- **API:** <https://automatic-panorama-api.onrender.com>
  ([interactive docs](https://automatic-panorama-api.onrender.com/docs))

> The backend runs on Render Free, which sleeps when idle. The first request
> after a quiet period can take about a minute while the service wakes up.

## Features

- Upload 2-8 overlapping frames (JPEG, PNG, WebP, BMP, TIFF; HEIC/HEIF photos
  are converted in the browser before upload).
- SIFT as the default feature detector, with ORB as a selectable alternative.
- KNN descriptor matching with Lowe's ratio test (L2 for SIFT, Hamming for ORB).
- Pairwise Homography estimation with `cv2.findHomography` and RANSAC.
- Automatic image ordering, reference selection, and transform composition.
- Multi-image warping onto a bounded common canvas.
- Feather blending with simple exposure compensation, border cropping, and a
  downloadable PNG.
- Alignment diagnostics: match and inlier counts, inlier ratio, reprojection
  error, a feature-survival funnel, per-pair results, and stage timings.
- A seam and inlier overlay drawn on top of the stitched result.
- Actionable errors instead of distorted output when overlap is too weak, a
  homography is degenerate, or a file cannot be decoded.
- Adjustable ratio threshold and RANSAC reprojection threshold, a request
  timeout, and cancel.

## How it works

```text
Browser (React + Vite)                 FastAPI + OpenCV (stateless)
─────────────────────                  ─────────────────────────────────────────
pick frames, HEIC → JPEG  ── POST ──▶  validate uploads and settings
choose detector/thresholds  /api/v1/   decode, normalize, downscale to budget
                             stitch    SIFT / ORB features
                                       KNN matching + Lowe ratio test
                                       RANSAC homographies, pair acceptance
                                       order images, compose transforms
                                       warp onto canvas
                                       feather blend, crop, encode PNG
show panorama, overlay,   ◀── JSON ──  image (data URL) + diagnostics
diagnostics, or error                  or a stable error code
```

Uploaded images and intermediate arrays live only for the duration of a
request; nothing is stored.

### API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/healthz` | Liveness check used by Render and the keep-alive monitor |
| `GET` | `/api/v1/config` | Upload limits and default thresholds for the UI |
| `POST` | `/api/v1/stitch` | Multipart `files` plus optional `detector`, `ratio_threshold`, `ransac_reproj_threshold` |

The full contract, error catalogue, and settings are in
[docs/backend-spec.md](docs/backend-spec.md).

## Repository map

```text
Automatic-Panorama/
├── backend/                 FastAPI app, CV pipeline, and tests
│   └── app/
│       ├── api/             Thin HTTP routes
│       ├── core/            Environment-backed settings and error codes
│       ├── cv/              Features, matching, homography, warping, blending
│       ├── schemas/         Typed request/response contracts
│       ├── services/        Pipeline orchestration
│       └── tests/           Unit, contract, and end-to-end tests
├── frontend/                React/Vite/TypeScript SPA
├── docs/                    Architecture, pipeline, specs, roadmap, deployment
├── task-plans/              Tracer-bullet work slices for five contributors
├── scripts/                 Public smoke test and sample generators
├── .github/                 CI, issue templates, pull-request checklist
├── CLAUDE.md                Agent and teammate working agreement
├── CONTRIBUTING.md          Branch, commit, review, and ownership workflow
├── requirements.txt         Assignment-visible Python runtime dependencies
├── render.yaml              Render Free backend blueprint
└── Makefile                 Repeatable local quality commands
```

Read the documents in this order:

1. [Assignment alignment](docs/assignment-alignment.md)
2. [Architecture](docs/architecture.md)
3. [CV pipeline](docs/cv-pipeline.md)
4. [Backend specification](docs/backend-spec.md)
5. [UI specification](docs/ui-spec.md)
6. [Contribution plan](docs/contribution-plan.md)
7. [Roadmap](docs/roadmap.md)
8. [Deployment plan](docs/deployment-plan.md)

## Quick start

### Backend

Python 3.11+ is required. Python 3.12 is the recommended local version.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt -r backend/requirements-dev.txt
cp backend/.env.example backend/.env
PYTHONPATH=backend uvicorn app.main:app --reload --port 8000
```

Check `http://localhost:8000/healthz` and API documentation at
`http://localhost:8000/docs`.

### Frontend

In another terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:5173`. Plain `npm run dev` always talks to the real API
at `VITE_API_BASE_URL` (default `http://localhost:8000`). Use `npm run dev:mock`
only when you need the fixture state switcher without a backend. If an older
`frontend/.env.development.local` sets `VITE_MOCK_API`, delete that line; mode
selection now owns the flag.

Regenerate the frontend's committed API response fixtures after a backend
contract change:

```bash
make contract-snapshots
```

### Quality checks

From the repository root:

```bash
make test
make lint
make frontend-build
```

The same checks run in GitHub Actions. See [CONTRIBUTING.md](CONTRIBUTING.md)
for the pull-request gate.

## Deployment

- **Frontend:** Vercel Hobby, project root `frontend/`, with
  `VITE_API_BASE_URL` set to the Render URL.
- **Backend:** Render Free Web Service (Singapore) from
  [render.yaml](render.yaml), root `backend/`, health check `/healthz`.
- CORS allows the production Vercel origin, Vercel preview origins for this
  project, and local development.

Environment settings, tradeoffs, and the verification checklist are in
[docs/deployment-plan.md](docs/deployment-plan.md).

## Scope decisions

- v1 is stateless: uploaded files are processed in memory and are not stored.
- No paid database, object store, GPU, queue, or third-party vision API is
  required.
- Every threshold (upload limits, ratio test, RANSAC, inlier acceptance,
  output size, timeout) is an environment-backed setting, not a constant in
  route code.

## Contribution

Every member owns a visible vertical slice of the project. Start with
[docs/contribution-plan.md](docs/contribution-plan.md), then follow
[CONTRIBUTING.md](CONTRIBUTING.md). Do not commit real images containing
private or identifying information; use generated or licensed fixtures and
record their source in the documentation.
