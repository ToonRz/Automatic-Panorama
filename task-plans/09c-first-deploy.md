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
      **Partially verified**: live, Singapore, Free plan, and the build log
      line `Using Python version 3.12.14 via /opt/render/project/src/.python-version`
      were all confirmed via the Render API. `/healthz` returning 200 was
      **not** verified by the deploying session — its network egress policy
      blocks `*.onrender.com` outright. Run
      `curl -si https://automatic-panorama-api.onrender.com/healthz` to close
      this out.
- [ ] Render auto-deploy is set to deploy after CI checks pass;
      **Not done.** The Render MCP's `create_web_service` tool has no
      `autoDeployTrigger` parameter, so the service was created with the
      default (`commit`, i.e. deploys immediately on push). Set it to
      "After CI Checks Pass" in the dashboard: service → Settings → Auto-Deploy.
- [ ] Vercel Production serves `main`, and the `test` branch Preview exists;
      **Not verified.** A `test` branch was pushed from `main` on GitHub, but
      whether Vercel built Preview/Production deployments for it could not be
      checked: the Vercel MCP connector available to this session had no team
      linked (`list_teams` returned empty) and `npx vercel whoami` was logged
      out, and `*.vercel.app` is also blocked by this session's egress policy.
- [ ] both CORS values are set, and section 10 of `docs/deployment-plan.md`
      records the URLs, the served commit, and the Preview pattern;
      **Partially done.** `BACKEND_CORS_ORIGIN_REGEX` is set to
      `^https://automatic-panorama-[a-z0-9-]+-toonrzs-projects\.vercel\.app$`
      (derived from the real project/team slugs seen in this repo's Vercel
      GitHub-App check runs, and verified in Python against every case in
      deployment-plan.md section 5). `BACKEND_CORS_ORIGINS` is still
      `http://localhost:5173` only — the real Vercel production origin is
      unconfirmed (see above) and must be added once known.
- [ ] a Preview deploy from a teammate-authored commit is observed as blocked,
      and one from a ToonRz merge commit deploys, confirming section 4.1;
      **Half-observed, organically.** Every commit this session pushed is
      authored `Claude <noreply@anthropic.com>` (not ToonRz), and the repo's
      pre-existing Vercel GitHub-App integration reported a failed
      deployment on both PR #2's and PR #3's head commits — consistent with,
      though not conclusively proven to be caused by, the Hobby commit-author
      rule (Vercel's own failure message is generic). The merge commits this
      session created via the GitHub API (`03518ba`, `9f2f373`) are correctly
      authored `ToonRz <...>` (GitHub attributes an API-driven merge to the
      calling token's identity), which is the necessary condition for a
      deploy to be attempted — but whether that Production deploy actually
      succeeded could not be confirmed from this session (no way to query a
      commit's status outside a pull request with the available tools, and
      no Vercel account access either way).
- [x] `CONTRIBUTING.md` states the merge rule.
