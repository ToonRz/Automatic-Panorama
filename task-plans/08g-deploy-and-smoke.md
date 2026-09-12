# Task 08g - public deployment and smoke evidence

- Owner: TBD (needs access to the Render and Vercel projects)
- Reviewers: TBD
- Depends on: 08a, 08b, 08c, 08d, 08e, 08f
- Spec: `docs/integration-spec.md` section 10, 2 (G16)

## Scope

Deploy the backend to Render and the frontend to Vercel from `main`, set the
exact CORS origin, add a scripted smoke check, and record a manual pass on the
public URL with real photos. Takes over the deployment bullets of
`task-plans/05`; task 05 keeps CI.

## Files

- `scripts/smoke_public.py` - new
- `docs/deployment-plan.md` - public URLs, served commit, smoke results
- `task-plans/05-ci-deployment-demo.md` - point deployment bullets here

## Acceptance

This build environment has no Render or Vercel account, so nothing below that
needs live hosting access could be completed or verified here. What could be
built and proven locally was: `scripts/smoke_public.py` exists, and running it
against a local `uvicorn` instance (`python scripts/smoke_public.py
http://localhost:8000`) checks `/healthz`, `/api/v1/config`, and a synthetic
three-frame stitch, and passes. `docs/deployment-plan.md` and this file record
that status and list the remaining steps. Every item below needs a human with
Render and Vercel access:

- [ ] Render service healthy on `/healthz`; `BACKEND_CORS_ORIGINS` is the exact
      Vercel origin plus `http://localhost:5173`;
- [ ] Vercel build has `VITE_API_BASE_URL` set to the Render URL and
      `VITE_MOCK_API` unset;
- [ ] `python scripts/smoke_public.py <api-url>` passes health, config, and a
      synthetic three-frame stitch, and its output is pasted in the pull
      request (proven locally against `http://localhost:8000`; not yet run
      against a public Render URL);
- [ ] a browser request from the Vercel origin succeeds and one from another
      origin is blocked by CORS;
- [ ] manual pass on the public URL with screenshots: three 12 MP phone photos;
      a 48 MP set; HEIC in Safari and in Chrome; first run after 15 minutes
      idle; cancel then immediate retry;
- [ ] public URLs and the served commit are recorded in
      `docs/deployment-plan.md`, with no secrets.
