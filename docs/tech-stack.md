# Technology stack

The stack favors a small, explainable codebase and a Python runtime that can
install OpenCV without a paid inference service.

## Frontend

| Concern | Choice | Reason |
| --- | --- | --- |
| UI framework | React 19 | Small component model for upload, progress, diagnostics, and result states |
| Language | TypeScript | Typed API response and file/settings contracts |
| Build tool | Vite | Fast local feedback and static output suitable for Vercel |
| Styling | Plain CSS with project tokens | Avoids unnecessary UI dependencies for a five-person assignment |
| HTTP | Browser `fetch` + `FormData` | Native multi-file upload; no client library required |
| Hosting | Vercel Hobby | Free static hosting, previews, HTTPS, and a clean public URL |

## Backend

| Concern | Choice | Reason |
| --- | --- | --- |
| Language | Python 3.11+ (recommended 3.12) | Best fit for OpenCV and the course methods |
| API framework | FastAPI + Uvicorn | Typed request validation, OpenAPI, and a simple ASGI deployment |
| Computer vision | `opencv-python-headless` | SIFT/ORB, BF matching, Homography/RANSAC, warping, and masks without GUI libraries |
| Arrays/images | NumPy + Pillow | Matrix operations and safe image decoding/encoding |
| Configuration | pydantic-settings | Environment-backed thresholds and upload limits |
| Tests | pytest + FastAPI TestClient | Fast unit and API contract checks |
| Hosting | Render Free Web Service | Free public Python service with a configurable `PORT` and health check |

## Data and runtime boundaries

- v1 has no database, queue, object store, or login system.
- Images are held in memory for one request and discarded after the response.
- There are no model weights or external APIs; the core method is classical CV.
- The backend is stateless so Render's ephemeral disk is not a correctness
  dependency.

## Why not put OpenCV in a Vercel Function?

Vercel supports Python functions, but a browser-uploaded image workflow has
payload, bundle, memory, and duration constraints. Keeping Vercel responsible
for static frontend delivery and Render responsible for the Python/OpenCV
request makes the boundary visible and avoids an unnecessary proxy. If the
team later tests a Vercel-only deployment, it must measure the actual bundle,
payload, and worst-case processing time first.

## Versioning policy

The initial scaffold uses bounded dependency ranges to stay compatible with
Python 3.11/3.12 and current free hosts. When implementation begins, generate
and review a lock file or a tested deployment image; do not upgrade OpenCV,
NumPy, or the frontend toolchain in the same PR as a CV behavior change.
