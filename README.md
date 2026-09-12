# Automatic Panorama Stitcher

CP461: Introduction to Computer Vision - Semester 1/2026

This repository is the planning and implementation scaffold for a five-person
group project that builds an **Automatic Panorama Stitcher**. The target is a
Tier 3 submission: a clean GitHub repository, reproducible local execution, a
public web application, and a strict 10-minute demonstration.

> Status: scaffold complete; the production panorama algorithm is intentionally
> not implemented yet. The backend returns a clear `501 Not Implemented` from
> `/api/v1/stitch` until the CV work is merged and tested.

## What the project will demonstrate

- Multi-image input with a React + TypeScript browser interface.
- A Python + FastAPI backend using OpenCV.
- SIFT as the default feature detector, with ORB as a selectable fallback.
- Descriptor matching with Lowe's ratio test.
- Robust Homography estimation with RANSAC and inlier diagnostics.
- Multi-image warping onto a common canvas.
- Seamless blending, cropping, and a downloadable panorama.
- Free public deployment: Vercel for the frontend and Render Free for the
  stateless Python/OpenCV backend.

## Repository map

```text
Automatic-Panorama/
├── backend/                 FastAPI app and CV module boundaries
├── frontend/                React/Vite/TypeScript SPA
├── docs/                    Architecture, pipeline, roadmap, deployment, demo
├── task-plans/              Tracer-bullet work slices for five contributors
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
4. [Contribution plan](docs/contribution-plan.md)
5. [Roadmap](docs/roadmap.md)
6. [Deployment plan](docs/deployment-plan.md)
7. [10-minute demo script](docs/demo-script.md)

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

Open `http://localhost:5173`. The UI is already wired to the backend contract;
the submit action will show the intentional scaffold response until the CV
pipeline is implemented.

### Quality checks

From the repository root:

```bash
make test
make lint
make frontend-build
```

The same checks run in GitHub Actions. See [CONTRIBUTING.md](CONTRIBUTING.md)
for the pull-request gate.

## Scope decisions

- v1 is stateless: uploaded files are processed in memory and are not stored.
- No paid database, object store, GPU, queue, or third-party vision API is
  required for the assignment demo.
- The frontend is hosted on Vercel Hobby; the OpenCV runtime is hosted on a
  Render Free Web Service. The tradeoffs and exact setup are documented in
  [docs/deployment-plan.md](docs/deployment-plan.md).

## Contribution

Every member owns a visible vertical slice and presents part of the demo.
Start with [docs/contribution-plan.md](docs/contribution-plan.md), then follow
[CONTRIBUTING.md](CONTRIBUTING.md). Do not commit real images containing
private or identifying information; use generated or licensed fixtures and
record their source in the documentation.
