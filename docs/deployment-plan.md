# Production deployment plan

This is the production spec for the public deployment. Execution is tracked in
`task-plans/09-production-deploy.md`. It supersedes the demo-only plan that
`task-plans/08g-deploy-and-smoke.md` worked from; the decisions behind it are
D-008 and D-009 in `docs/decision-log.md`.

## 1. Goals and non-goals

Production here means the course submission and its demo: the audience is the
instructor, the grader, and classmates, over the grading window. The target is
a backend that answers the first request of the day without a cold start.

Goals:

- the Vercel frontend and the Render backend are public and serve `main`;
- the backend does not spin down while the keep-alive monitor is running;
- a broken deploy can be rolled back in under a minute;
- Vercel Preview deployments can call the production backend for QA on `test`.

Non-goals, decided rather than forgotten:

- no custom domain; the generated `*.vercel.app` and `*.onrender.com` hosts are
  the public URLs;
- no rate limiting, authentication, or analytics. Upload limits, the stitch
  timeout, and `MAX_CONCURRENT_STITCHES=1` (D-006) are the whole abuse story. A
  per-IP limit on a single instance that restarts at will would add code
  without adding protection;
- no staging backend. Preview deployments share the production backend;
- no paid plan. The budget is $0 (D-008).

## 2. Topology

| Piece | Host | Plan | Region | Source |
| --- | --- | --- | --- | --- |
| Frontend (static Vite build) | Vercel | Hobby | global CDN | `frontend/`, branch `main` |
| Backend (FastAPI/OpenCV) | Render Web Service | Free | Singapore | `render.yaml`, branch `main` |
| Keep-alive and alerting | UptimeRobot | Free | n/a | HTTP monitor on `/healthz` |

The browser calls the backend directly; Vercel does not proxy image payloads
(`docs/architecture.md`). Singapore is the Render region closest to the users
in Thailand. A Render region cannot be changed after the service is created,
so `render.yaml` fixes it before the first deploy.

## 3. Backend on Render Free

### 3.1 Service definition

`render.yaml` is the Blueprint and the source of truth. Settings that matter
for production:

| Setting | Value | Why |
| --- | --- | --- |
| `plan` | `free` | D-008 |
| `region` | `singapore` | latency for the audience; fixed at creation |
| `rootDir` | `backend` | monorepo layout |
| `buildCommand` | `pip install -r requirements.txt` | `backend/requirements.txt` includes the root file |
| `startCommand` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | Render requires `0.0.0.0:$PORT` |
| `healthCheckPath` | `/healthz` | shared with the keep-alive monitor |
| `autoDeployTrigger` | `checksPass` | a push to `main` deploys only after GitHub CI passes |

### 3.2 Python version

Render picks the Python version from, in order: the `PYTHON_VERSION`
environment variable (must be a full `x.y.z`), then a `.python-version` file
at the repository root, then a default tied to the service creation date
(3.14.x for services created after 2026-02-11). The repository root already
has `.python-version` = `3.12`, matching CI.

The first deploy must show Python 3.12 in the build log. If it does not
(for example because `rootDir` hides the root file), set `PYTHON_VERSION` in
`render.yaml` to a full 3.12 patch that Render supports and redeploy. Do not
let the service run on the 3.14 default: OpenCV and NumPy wheels are pinned
and tested against 3.12 only.

### 3.3 Environment

Every non-secret threshold is committed in `render.yaml`. Values that depend on
the deployed hosts are `sync: false`:

| Variable | Value | Owner |
| --- | --- | --- |
| `BACKEND_CORS_ORIGINS` | exact Vercel production origin, then `http://localhost:5173` | 09c |
| `BACKEND_CORS_ORIGIN_REGEX` | the Preview pattern in section 5 | 09a adds it, 09c sets it |

Render prompts for `sync: false` values only when the Blueprint is first
created. Later Blueprint syncs ignore them, so a change to either value is made
in the Render dashboard and recorded in section 10.

### 3.4 Free-plan constraints

| Constraint | Effect | Response |
| --- | --- | --- |
| Spins down after 15 minutes with no inbound traffic; spin-up takes about a minute | first visitor waits | keep-alive monitor, section 6 |
| 750 free instance hours per workspace per month; when exhausted, every free service in the workspace is suspended until the next month | one always-on service uses about 744 hours in a 31-day month | this workspace runs no other free service; section 6.3 |
| Render may restart a free service at any time | an in-flight stitch can fail | the frontend health-retry and cold-start notice stay in place (`frontend/src/constants/availability.ts`) |
| Single instance, 512 MB RAM, a fraction of a CPU | the worst-case stitch can run out of memory | memory budget, section 7 |
| Ephemeral filesystem | files vanish on restart | the service is stateless (D-003) |

## 4. Frontend on Vercel Hobby

| Setting | Value |
| --- | --- |
| Git repository | `ToonRz/Automatic-Panorama` (private) |
| Vercel account | ToonRz's Hobby team |
| Root directory | `frontend` |
| Framework preset | Vite |
| Build command / output | `npm run build` / `dist` |
| Production branch | `main` |
| `VITE_API_BASE_URL` (Production and Preview) | the Render service URL |
| `VITE_MOCK_API` | unset in every environment; a production build with it set fails (08f) |
| Rewrites | `frontend/vercel.json` sends SPA routes to `index.html` |

### 4.1 Commit author rule

On a Hobby team, Vercel deploys a commit from a private repository only when
the commit author is the Hobby team owner. This applies to Production and
Preview deployments. Consequences for this repository:

- ToonRz merges every PR into `test` and into `main`;
- those merges use **Create a merge commit**. A squash or rebase merge keeps
  the PR author as commit author, and Vercel blocks that deploy;
- Preview deployments of teammates' feature branches are expected to be
  blocked. QA happens on the `test` branch Preview, which ToonRz's merge
  commits deploy;
- if a deploy is blocked anyway, check that ToonRz's Vercel account has GitHub
  linked under Login Connections and that the merge commit's author email is
  a verified email on that GitHub account.

Upgrading to Vercel Pro is the only way to lift the rule, and it is out of
budget.

## 5. CORS

The backend accepts two kinds of origin:

1. **Exact origins** from `BACKEND_CORS_ORIGINS`: the Vercel production origin
   and `http://localhost:5173`.
2. **Preview origins** matched by `BACKEND_CORS_ORIGIN_REGEX`, passed to
   Starlette's `allow_origin_regex`. Vercel names Git deployments
   `<project>-git-<branch>-<scope>.vercel.app` (branch) and
   `<project>-<hash>-<scope>.vercel.app` (commit). The pattern is anchored and
   scoped to this project and this Vercel account:

   ```text
   ^https://<project>-[a-z0-9-]+-<scope-slug>\.vercel\.app$
   ```

   `<project>` and `<scope-slug>` are known once the Vercel project exists
   (09c). The pattern must not match another project or another account on
   `vercel.app`.

An unset or empty regex setting means no pattern is applied, so local
development and tests behave exactly as they do today. Vercel truncates a
generated host label longer than 63 characters; a very long branch name can
therefore produce a Preview host the pattern does not match. Keep branch
names that need a Preview short.

## 6. Keep-alive and alerting

### 6.1 Monitor

| Setting | Value |
| --- | --- |
| Service | UptimeRobot Free (50 monitors, 5-minute minimum interval) |
| Account | ToonRz |
| Type | HTTP(s) |
| URL | `https://<render-service>.onrender.com/healthz` |
| Interval | 5 minutes |
| Alert contact | ToonRz's email |
| Schedule | 24/7, no end date |

A request every 5 minutes keeps the service below the 15-minute spin-down
threshold with two misses to spare, and the same monitor alerts on an outage.
The alert email is the production incident signal; there is no other.

### 6.2 Why not the other schedulers

- GitHub Actions `schedule`: the repository is private, each run bills at
  least one minute, and a 10-minute cron costs about 4,300 minutes a month
  against a 2,000-minute free allowance.
- cron-job.org: keeps the service awake but does not alert.

### 6.3 Instance-hour budget

At 24/7 the service uses about 720 hours in a 30-day month and 744 in a 31-day
month, inside the 750-hour workspace allowance with little to spare. Therefore:

- the Render workspace that hosts this service must run no other free web
  service;
- on the first of each month, ToonRz checks the instance-hour usage in the
  Render dashboard. A projected overrun is resolved by pausing another free
  service, never by letting the workspace be suspended.

### 6.4 Turning keep-alive off

When the project no longer needs to be always on:

1. pause or delete the UptimeRobot monitor;
2. leave the Render service running; it returns to spin-down behaviour and the
   frontend's cold-start notice covers the first request;
3. record the date in section 10.

If "always on" later needs to hold without the monitor, change `plan: free` to
`plan: starter` in `render.yaml` (paid) and remove the monitor.

## 7. Memory budget

Render Free has 512 MB of RAM. The budget is **peak resident memory of the
worst accepted request at or below 410 MB**, leaving about 20 percent headroom
for the interpreter, OpenCV allocator growth, and a concurrent `/healthz`.

### 7.1 Measurement

Measured locally in a container capped like the instance (09b):

```bash
docker run --rm --memory=512m --memory-swap=512m -p 8000:8000 <backend-image>
```

The worst accepted request is the one the current settings admit at their
limits: `MAX_UPLOAD_FILES` frames, each decoded at the largest size
`MAX_IMAGE_PIXELS` and `MAX_TOTAL_UPLOAD_MB` allow, stitched at the largest
per-request long edge D-005 yields for that count. The peak is read from the
container's cgroup (`memory.peak`), not from `docker stats` sampling. The
normal path, three budget-sized frames prepared by the browser (08c), is
measured and recorded as well.

`backend/scripts/measure_peak_memory.py` implements this: it starts a fresh
`python:3.12-slim` container per run with `--memory=512m --memory-swap=512m`,
the repository mounted read-only, and the same install/start commands and
`render.yaml` environment as production; it generates the synthetic pan
in-process (no photo is committed), posts it, and reads the peak from the
container's cgroup (`memory.peak` on cgroup v2, `memory.max_usage_in_bytes` on
v1), detecting an OOM kill as a failure rather than a number. Run it with:

```bash
python backend/scripts/measure_peak_memory.py --profile worst --runs 3
python backend/scripts/measure_peak_memory.py --profile normal --runs 3
```

**Status: blocked, not yet measured.** The session that wrote this script
could not run it: this environment's egress proxy returns 403 for the Docker
Hub CDN host (`production.cloudfront.docker.com`), so `docker pull
python:3.12-slim` fails before a container ever starts, and the guidance for
that failure class is to report the blocked host rather than retry or route
around it. No peak-memory number is recorded here because none was actually
measured — inventing one would violate the acceptance criteria for this task
and the standing rule against distorting a result. `render.yaml` and
`backend/app/core/config.py` kept their pre-09b defaults (`MAX_UPLOAD_FILES:
8`, `MAX_OUTPUT_PIXELS: 8000000`, `INPUT_LONG_EDGE_CAP: 1600`) at the time.
Since `a0619b2`, `render.yaml` sets `INPUT_LONG_EDGE_CAP` to 1000 as the
mitigation for the phone-photo memory incident (after section 11), while the
config default stays 1600; that change had no measured peak behind it.
Someone with a normal Docker network path (a laptop, a CI runner without this
proxy policy) should run the two commands above, three times each per the
method, and fill in the table below with the results before 09c's Render
service is treated as memory-verified.

| Profile | Frames | Peak (MB) | Runs | Docker version | Python image | OOM? |
| --- | --- | --- | --- | --- | --- | --- |
| worst | 8 @ ~50 MP | _pending_ | _pending_ | _pending_ | `python:3.12-slim` | _pending_ |
| normal | 3 @ 1600px long edge | _pending_ | _pending_ | _pending_ | `python:3.12-slim` | _pending_ |

### 7.2 If the budget is exceeded

Lower settings in this order, re-measuring after each change:

1. `MAX_OUTPUT_PIXELS`;
2. `MAX_UPLOAD_FILES`;
3. `INPUT_LONG_EDGE_CAP`, last, because it lowers alignment quality.

A change goes into `render.yaml` and into the defaults in
`backend/app/core/config.py` only if tests and the published `/api/v1/config`
table stay consistent (08b). If the peak is dominated by something these three
settings do not control, for example decoding a maximum-pixel image, stop and
record it in 09b for a decision rather than choosing another setting.

## 8. Release flow

```text
feature branch -> PR into develop -> PR into test -> PR into main
                                     (Preview QA)    (Production)
```

1. A PR into `test` is merged by ToonRz with a merge commit. Vercel builds the
   `test` branch Preview, which calls the production backend through the
   Preview CORS pattern. QA runs there.
2. A PR from `test` into `main` is merged by ToonRz with a merge commit after
   the `CONTRIBUTING.md` gate (one approval, CI green).
3. Vercel deploys `main` to Production immediately. Render deploys `main`
   after GitHub CI reports success (`checksPass`).
4. Run the smoke check in section 9.1 against production after both deploys
   finish.

Because Render waits for CI and Vercel does not, the frontend can be live for a
few minutes before the matching backend. A change that needs both sides at once
must keep the backend backwards compatible for that window, or be split into a
backend release followed by a frontend release.

### 8.1 Rollback runbook

When production is broken after a deploy:

1. **Backend:** Render dashboard → service → Events → the last good deploy →
   Rollback. This also turns off auto-deploy for the service; turn it back on
   after the fix is merged.
2. **Frontend:** Vercel dashboard → project → Deployments → the last good
   Production deployment → Instant Rollback. Vercel stops promoting new
   `main` builds until a deployment is promoted again.
3. Confirm with `python scripts/smoke_public.py <render-url>` and one browser
   stitch on the production URL.
4. Revert the offending change through `develop → test → main` like any other
   change, then re-enable auto-deploy on Render and promote the fixed build on
   Vercel.
5. Record the incident (date, symptom, rolled-back commit, fix PR) in
   section 10.

## 9. Production readiness

Production is ready when every item holds. Evidence goes into the 09 task
files and is summarized in section 10.

### 9.1 Scripted

- `python scripts/smoke_public.py https://<render-service>.onrender.com`
  passes `/healthz`, `/api/v1/config`, and the synthetic three-frame stitch.
  Output is pasted into the PR.
- A request with `Origin: <vercel production origin>` and one with
  `Origin: <test branch preview origin>` both receive
  `access-control-allow-origin`. One with `Origin: https://example.vercel.app`
  does not.

### 9.2 Always on

- The UptimeRobot monitor is green for 24 consecutive hours after the first
  production deploy.
- After at least 30 minutes with no user traffic, the first browser stitch
  starts without the cold-start notice and the `/healthz` round trip is under
  2 seconds.

### 9.3 Memory

- The worst accepted request (section 7.1) peaks at or below 410 MB, with the
  settings committed in `render.yaml`.

### 9.4 Manual pass on the production URL

With screenshots:

- three 12 MP phone photos stitch;
- a 48 MP photo set stitches or is rejected with the documented error;
- a HEIC file in Safari and in Chrome;
- cancel followed by an immediate retry;
- the `test` branch Preview completes one stitch against the production
  backend.

### 9.5 Records

- Section 10 lists both public URLs, the served commit, the UptimeRobot
  monitor, and the date keep-alive was enabled. No secrets appear.
- The Render build log shows Python 3.12.

## 10. Public URLs and operations log

Backend and frontend are both live. The Vercel side of 09c (project root
directory, env vars, confirming the production domain) had to be completed
manually by ToonRz after this session's deploy pass: the Vercel MCP
connector available to this deploy session had no team linked and its CLI
was logged out, so it could not be automated — see the hand-off list in the
09c PR and the session's final report. ToonRz also found and fixed a Root
Directory misconfiguration (the Vercel project was scanning the whole repo
and trying to deploy `backend/app/main.py` as a Python/FastAPI serverless
function instead of building `frontend/` with Vite) that had been the real
cause of every failed "Vercel" GitHub check throughout this session, not
solely the D-009 commit-author rule as first suspected.

| Item | Value |
| --- | --- |
| Frontend (Vercel Production) | `https://automatic-panorama.vercel.app` |
| `test` branch Preview | _pending confirmation_. On 2026-09-28 the expected branch alias `https://automatic-panorama-git-test-toonrzs-projects.vercel.app` returned 404; verify the real Preview URL in the Vercel Deployments tab |
| Backend (Render) | `https://automatic-panorama-api.onrender.com` (Free, Singapore) |
| Served commit | Render: `9ff021afaa1fd764b4f7a8915a006322b9bbad75` (live since 2026-09-27 18:36 UTC, per the Render API). Vercel: not checked, since this session has no Vercel team access |
| Preview CORS pattern | `^https://automatic-panorama-[a-z0-9-]+-toonrzs-projects\.vercel\.app$` (set on Render; verified in Python against the branch-preview host, a commit-hash host, an `.evil.com` suffix, another project name, and `http://`, per section 5) |
| UptimeRobot monitor | _pending — hand-off, requires a human-owned account (09d)_ |
| Keep-alive enabled on | _pending_ |
| Keep-alive disabled on | _still on_ |

`BACKEND_CORS_ORIGINS` on Render is now
`https://automatic-panorama.vercel.app,http://localhost:5173`. The CORS half
of section 9.1 was verified with curl on 2026-09-28 from a machine without the
egress block:

| Check | Result |
| --- | --- |
| `GET /healthz` | 200, `{"status":"ok","service":"automatic-panorama-api","environment":"production"}`, 0.16 s (warm, 9 minutes after a deploy) |
| `GET /api/v1/config` | 200, the nine client fields; `max_input_long_edge_by_count` is 1000 for every count |
| `OPTIONS /api/v1/stitch`, `Origin: https://automatic-panorama.vercel.app` | 200, `access-control-allow-origin` echoes the origin |
| `OPTIONS /api/v1/stitch`, `Origin: https://automatic-panorama-git-test-toonrzs-projects.vercel.app` | 200, `access-control-allow-origin` echoes the origin (the Preview regex) |
| `OPTIONS /api/v1/stitch`, `Origin: https://example.vercel.app` | 400, no `access-control-allow-origin` |
| production bundle | `/assets/index-BsA0NQY2.js` contains `https://automatic-panorama-api.onrender.com` |

`scripts/smoke_public.py` was not run in that check: it needs OpenCV and NumPy
locally, and that machine had neither.

The live Render service does not match the section 3.1 Blueprint, because it
was created through the Render API rather than from `render.yaml`. The Render
API reported this on 2026-09-28:

| Setting | `render.yaml` | Live service |
| --- | --- | --- |
| `autoDeployTrigger` | `checksPass` | `commit` (deploys on every push, before CI) |
| `healthCheckPath` | `/healthz` | empty (no health check) |
| `rootDir` | `backend` | empty, with `cd backend && uvicorn …` as the start command |

The first two need a dashboard change by the account owner: service →
Settings → Auto-Deploy, and service → Settings → Health Check Path.

### 09e automated-evidence attempt

The deploying session's network egress policy blocks both `*.onrender.com`
and `*.vercel.app` outright (confirmed with curl, `httpx`, and the WebFetch
tool — all return a 403 from the local egress proxy, not from Render or
Vercel). As a direct result, none of section 9.1's scripted checks could be
run against the live URLs from this session:

- `python scripts/smoke_public.py https://automatic-panorama-api.onrender.com`
  fails immediately with `httpx.ProxyError: 403 Forbidden` before making any
  real request — not a failure of the deployed service.
- `curl -si -X OPTIONS https://automatic-panorama-api.onrender.com/api/v1/stitch -H "Origin: ..." -H "Access-Control-Request-Method: POST"`
  likewise returns a 403 from the local proxy for every origin tried,
  including the negative case (`https://example.vercel.app`), so no CORS
  behaviour was actually exercised.
- Fetching the production site to inspect the built JS was not attempted:
  no confirmed Vercel production URL exists yet (see above).

What this session *could* check without leaving the Render API itself:
`get_metrics` on `srv-daj3retg1s2s739asd90` for `memory_usage`/`memory_limit`
over the deploy window shows `memory_limit` at 536,870,900 bytes (512 MiB, as
expected for Free) and idle `memory_usage` around 67-77 MB — consistent with
an idle FastAPI/uvicorn process, but this is idle memory, not the loaded
worst-case request 09b's 410 MB budget is about, so it does not close out
section 9.3.

All of section 9.1, the always-on check (9.2), the memory-under-load
comparison (9.3), and the manual pass (9.4) need to be run by someone (or
some CI runner) whose network can actually reach `*.onrender.com` and
`*.vercel.app` — see the hand-off list in the session's final report for the
exact commands.

| Date | Event |
| --- | --- |
| 2026-09-13 | `automatic-panorama-api` created on Render Free/Singapore and deployed live from `main`; Preview CORS regex set and verified in Python; Vercel side and all of section 9's live checks left to hand-off (see above) |
| 2026-09-13 | `INPUT_LONG_EDGE_CAP` reduced to 1000 on Render after the phone-photo memory incident (`a0619b2`) |
| 2026-09-28 | `/healthz`, `/api/v1/config`, and the three CORS preflights checked with curl against production (table above); Render serving `9ff021a`; Blueprint drift recorded |

## 11. References checked 2026-09-13

- [Render free instances](https://render.com/docs/free)
- [Render Blueprint spec](https://render.com/docs/blueprint-spec) (`region`, `autoDeployTrigger`, `sync: false`)
- [Render Python version](https://render.com/docs/python-version)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Vercel project collaboration](https://vercel.com/docs/deployments/troubleshoot-project-collaboration) (Hobby commit author rule)
- [Vercel generated URLs](https://vercel.com/docs/deployments/generated-urls)
- [UptimeRobot pricing](https://uptimerobot.com/pricing/)
- Alternatives weighed on the same date: Railway Hobby ($5/month, no free
  always-on option) and Firebase (Cloud Functions need the Blaze plan, and the
  32 MiB Cloud Run HTTP/1 request limit is below `MAX_TOTAL_UPLOAD_MB`). See
  D-008.

### Phone-photo memory incident (2026-09-13)

Three portrait phone frames prepared at a 1600 px long edge caused a dropped
stitch connection. Render sampled 536,756,220 bytes against a 536,870,900-byte
limit at 13:44 UTC, followed by a process restart at 13:44:52. The production
origin received a valid CORS header on `/healthz`. These observations point
to memory exhaustion rather than a HEIC decode failure.

The local three-frame reproduction completed but reached 1,071,611,904 bytes
maximum RSS on macOS. Blending now uses float32 accumulation, in-place
normalization, and one-channel exposure correction instead of several full
float64 RGB copies; exposure estimation keeps grayscale images as uint8.
The same local run reached 679,542,784 bytes after this change. These macOS
measurements are comparative evidence, not Linux cgroup limits or proof
that the default 1600 px budget fits Render Free.

The Render `INPUT_LONG_EDGE_CAP` override and Blueprint are reduced to 1000
as the operational mitigation. The backend enforces this cap even for an
already-open client that submits 1600 px images. Local development defaults
remain 1600. The blend regression test checks temporary NumPy allocations
and output equivalence within one intensity level; it does not measure all
OpenCV native allocations or replace the container memory harness.

Live verification after the cap update: the production stitch endpoint
returned HTTP 200 with `status: complete` for the same three phone scenes
submitted as 1200×1600 JPEGs. The server reduced them to 750×1000 and produced
1660×990 output, with 788/406 inliers and 1.17/1.21 px reprojection error.
The response included the production frontend's CORS origin. This run used
the existing deployed blend code; the allocation optimization above is a
separate local change pending deployment.
