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
- [ ] `curl -si -H "Origin: <origin>" <render-url>/healthz` shows
      `access-control-allow-origin` for the production origin and the `test`
      Preview origin, and not for `https://example.vercel.app`.

Always on (section 9.2):

- [ ] after at least 30 minutes with no user traffic, the first browser stitch
      shows no cold-start notice, and the `/healthz` round trip is under
      2 seconds, with a screenshot of the network timing.

Memory (section 9.3):

- [ ] 09b's recorded peak applies to the settings live on Render (compare the
      dashboard environment with `render.yaml`).

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
