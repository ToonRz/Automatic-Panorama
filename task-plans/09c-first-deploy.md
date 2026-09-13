# Task 09c - first production deploy

- Owner: ToonRz (account access required)
- Reviewers: TBD (backend)
- Depends on: 09a, 09b
- Spec: `docs/deployment-plan.md` sections 3, 4, 8

## Scope

Create the Render service and the Vercel project from `main`, connect them to
each other, and set up the merge rule the Vercel Hobby plan requires. No code
changes are expected; anything found wrong in `render.yaml` becomes a PR.

## Steps

1. **Render.** New Blueprint from `ToonRz/Automatic-Panorama`, branch `main`.
   Confirm the plan is Free, the region is Singapore, and auto-deploy is
   "after CI checks pass". The Blueprint prompts for the two `sync: false`
   values: set `BACKEND_CORS_ORIGINS=http://localhost:5173` for now and leave
   the regex empty.
2. Check that the workspace runs no other free web service
   (`docs/deployment-plan.md` section 6.3).
3. Open the build log and confirm Python 3.12. If it is not 3.12, follow
   section 3.2 in a PR and redeploy.
4. **Vercel.** Import the repository under ToonRz's Hobby team with root
   `frontend`, production branch `main`, and `VITE_API_BASE_URL` set to the
   Render URL for Production and Preview. Confirm `VITE_MOCK_API` is not set.
5. Confirm ToonRz's Vercel account has GitHub linked under Login Connections.
6. **CORS.** In the Render dashboard set `BACKEND_CORS_ORIGINS` to the exact
   Vercel production origin followed by `,http://localhost:5173`, and
   `BACKEND_CORS_ORIGIN_REGEX` to the pattern in section 5 with the real
   project name and scope slug. Let the service restart.
7. **Merge rule.** In GitHub repository settings, allow merge commits. Add to
   `CONTRIBUTING.md` that ToonRz merges into `test` and `main` with
   "Create a merge commit".
8. Merge `main` into `test` so the `test` branch Preview exists.

## Acceptance

- [ ] Render service is live in Singapore on the Free plan, `/healthz`
      returns 200, and the build log shows Python 3.12;
- [ ] Render auto-deploy is set to deploy after CI checks pass;
- [ ] Vercel Production serves `main`, and the `test` branch Preview exists;
- [ ] both CORS values are set, and section 10 of `docs/deployment-plan.md`
      records the URLs, the served commit, and the Preview pattern;
- [ ] a Preview deploy from a teammate-authored commit is observed as blocked,
      and one from a ToonRz merge commit deploys, confirming section 4.1;
- [ ] `CONTRIBUTING.md` states the merge rule.
