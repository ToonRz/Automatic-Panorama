# Free deployment plan

## Decision

Use two public services:

1. **Vercel Hobby ($0)** for the static React/Vite frontend.
2. **Render Free Web Service ($0 plan)** for the Python/FastAPI/OpenCV
   backend.

This is the primary plan because the assignment explicitly accepts Vercel and
Render for Tier 3, and Render can run a normal Python web service with native
Python dependencies such as `opencv-python-headless`.

“Free” means the provider's free plan and its quotas/terms; it does not mean an
unlimited SLA. No credit-based paid add-on, GPU, database, or object store is
part of the required deployment.

## Frontend: Vercel

Project settings:

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Framework | Vite (auto-detected) |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variable | `VITE_API_BASE_URL=https://<render-service>.onrender.com` |
| Rewrites | `frontend/vercel.json` sends SPA routes to `index.html` |

Steps:

1. Import the GitHub repository into Vercel.
2. Set the project root to `frontend`.
3. Set `VITE_API_BASE_URL` for Preview and Production.
4. Deploy and copy the generated `https://*.vercel.app` URL.
5. Add that exact URL to Render's `BACKEND_CORS_ORIGINS` along with local
   development origins when needed.

Vercel's Hobby plan is intended for personal/non-commercial projects and has
usage caps. The project only uses static hosting, so frontend image processing
does not consume Vercel Function runtime.

## Backend: Render Free

The checked-in `render.yaml` is the starting Blueprint:

| Setting | Value |
| --- | --- |
| Service type | Web Service |
| Plan | Free |
| Root directory | `backend` |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check | `/healthz` |
| Runtime | Python 3.11+; use the repository's `.python-version` where supported |

Required environment values:

```text
APP_ENV=production
BACKEND_CORS_ORIGINS=https://<vercel-project>.vercel.app
MAX_UPLOAD_FILES=8
MAX_UPLOAD_MB=12
DEFAULT_DETECTOR=SIFT
RATIO_THRESHOLD=0.75
RANSAC_REPROJ_THRESHOLD=5.0
MIN_INLIERS=12
```

Render requires a public web service to bind to `0.0.0.0` and the supplied
`PORT`. The service is intentionally stateless: it returns the encoded result
and discards all uploaded bytes.

## Tradeoffs and mitigations

| Constraint | Impact | Mitigation |
| --- | --- | --- |
| Render sleeps after idle time | First demo request can have roughly a one-minute cold start | Open the app and run a health check before recording; show a friendly “warming up” state |
| Render filesystem is ephemeral | Files disappear on restart/redeploy | Never persist uploads/results; use in-memory arrays only |
| Free service is single-instance | No horizontal scale | Cap file count/pixels and use small demo images |
| Free monthly hours/traffic quotas | Excessive automated polling can suspend service | No polling loop; frontend calls only on user action and health check |
| Vercel Hobby usage and personal-use terms | Not a production/commercial hosting commitment | Keep this as a course/personal project and monitor usage |
| Synchronous CV work | Long or huge jobs can time out or exhaust memory | Set upload/canvas limits, expose progress at the UI level, and measure worst-case latency |

## Why not the alternatives?

### Vercel Python Function for the backend

Vercel supports Python/ASGI functions, but the backend would inherit serverless
payload, bundle, memory, and execution constraints. The browser-to-Render
boundary is easier to explain and lets OpenCV run as a conventional Python
service. A Vercel-only experiment is acceptable as a spike, not the default.

### Hugging Face Spaces

Spaces are a good ML demo platform, but current official guidance says Gradio
and Docker Spaces require a paid plan to create, with a limited ZeroGPU
exception for eligible personal accounts. Therefore it is a fallback only if
the team's account explicitly has a qualifying free Gradio/ZeroGPU slot; it is
not the guaranteed free backend plan in this repository.

### Render Postgres or object storage

Neither is required. Render's free Postgres has a short-lived course/demo
profile and adds data-retention work; object storage would require a new
privacy decision. Stateless processing is the safest fit for the assignment.

## Deployment smoke test

After both services deploy:

```bash
curl -fsS https://<render-service>.onrender.com/healthz
curl -fsS -X POST https://<render-service>.onrender.com/api/v1/stitch \
  -H 'Origin: https://<vercel-project>.vercel.app' \
  -F 'files=@path/to/left.jpg' \
  -F 'files=@path/to/right.jpg'
```

Before Phase 3, the second command should return the intentional `501` with
`PIPELINE_NOT_IMPLEMENTED`. After implementation, it must return a valid
panorama response and diagnostics. Record the final public URLs and the
submission commit in the release checklist; do not put secrets in this file.

## Official references checked 2026-09-12

- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Vercel Python runtime](https://vercel.com/docs/functions/runtimes/python)
- [Vercel Functions limits](https://vercel.com/docs/functions/limitations)
- [Render free services](https://render.com/docs/free)
- [Render web services](https://render.com/docs/web-services)
- [Hugging Face Spaces overview](https://huggingface.co/docs/hub/en/spaces-overview)
