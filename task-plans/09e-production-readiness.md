# Task 09e - production readiness and rollback drill

- Owner: ToonRz (account access required)
- Reviewers: TBD (QA)
- Depends on: 09d
- Spec: `docs/deployment-plan.md` sections 8.1 and 9; `docs/integration-spec.md` I17

## Scope

Run every readiness check against production, rehearse the rollback runbook
once before it is needed, and close I17.

## Acceptance

Scripted (section 9.1):

- [ ] `python scripts/smoke_public.py <render-url>` passes, with output pasted
      in the PR;
      **Blocked from this session.** The deploying session's network egress
      policy blocks `*.onrender.com` outright (confirmed: curl, `httpx`, and
      the WebFetch tool all get a 403 from the local proxy, not from Render).
      Running the command produces `httpx.ProxyError: 403 Forbidden` before
      any real request goes out. Needs to be run from a machine with normal
      internet access: `python scripts/smoke_public.py https://automatic-panorama-api.onrender.com`.
- [ ] `curl -si -H "Origin: <origin>" <render-url>/healthz` shows
      `access-control-allow-origin` for the production origin and the `test`
      Preview origin, and not for `https://example.vercel.app`.
      **Blocked, same reason.** Also blocked on a second front: the real
      Vercel production origin and `test` Preview origin are unconfirmed
      (09c's Vercel steps could not be automated — see that PR). Once both
      are known, run the three `curl -si -X OPTIONS ... -H "Access-Control-Request-Method: POST"`
      checks from `docs/deployment-plan.md` section 9.1 from a machine that
      can reach `*.onrender.com`.

Always on (section 9.2):

- [ ] after at least 30 minutes with no user traffic, the first browser stitch
      shows no cold-start notice, and the `/healthz` round trip is under
      2 seconds, with a screenshot of the network timing.

Memory (section 9.3):

- [ ] 09b's recorded peak applies to the settings live on Render (compare the
      dashboard environment with `render.yaml`).
      **Blocked upstream.** 09b itself could not measure a peak (Docker Hub
      pulls blocked in that session too) — see `backend/scripts/measure_peak_memory.py`
      and `docs/deployment-plan.md` section 7.1. There is no peak to compare
      against yet. Separately, this session did pull idle `memory_usage`/
      `memory_limit` from Render's own `get_metrics` API (which doesn't need
      outbound access to `*.onrender.com`): `memory_limit` is 536,870,900
      bytes (512 MiB, correct for Free), idle usage ~67-77 MB. That's not a
      substitute for the loaded-request measurement this box needs.

Manual pass on the production URL (section 9.4), with screenshots:

- [ ] three 12 MP phone photos stitch;
- [ ] a 48 MP photo set stitches or is rejected with the documented error;
- [ ] HEIC in Safari and in Chrome;
- [ ] cancel followed by an immediate retry;
- [ ] the `test` branch Preview completes one stitch against production.

Rollback drill (section 8.1):

- [ ] on Render, roll back to the previous deploy, run the smoke check, then
      re-enable auto-deploy and redeploy `main`;
- [ ] on Vercel, Instant Rollback to the previous Production deployment, load
      the site, then promote the latest `main` deployment again;
- [ ] the drill is logged in section 10 with the time each rollback took.

Records (section 9.5):

- [ ] section 10 of `docs/deployment-plan.md` is complete, with no secrets;
- [ ] `docs/integration-spec.md` I17 and task 08 parent acceptance point to
      this task as closed.
