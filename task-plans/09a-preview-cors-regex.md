# Task 09a - Preview CORS pattern

- Owner: TBD
- Reviewers: TBD (backend) and ToonRz (deploy compatibility)
- Depends on: none
- Spec: `docs/deployment-plan.md` section 5

## Scope

Let Vercel Preview deployments of this project call the backend, without
opening CORS to every `vercel.app` host. Add one environment-backed setting and
pass it to Starlette's `allow_origin_regex`. Exact origins keep working as they
do today.

## Files

- `backend/app/core/config.py` - `backend_cors_origin_regex: str = ""`, and a
  property that returns `None` when it is empty
- `backend/app/main.py` - pass the property to `CORSMiddleware`
- `backend/app/tests/test_cors.py` - new
- `render.yaml` - `BACKEND_CORS_ORIGIN_REGEX` with `sync: false`
- `docs/backend-spec.md` - settings table

## Acceptance

- [ ] with the setting unset, CORS behaviour is unchanged: the configured exact
      origin gets `access-control-allow-origin`, and any other origin does not;
- [ ] with the setting `^https://automatic-panorama-[a-z0-9-]+-toonrzs-projects\.vercel\.app$`
      (a stand-in for the real names), a preflight and a simple `GET /healthz`
      from `https://automatic-panorama-git-test-toonrzs-projects.vercel.app`
      are allowed;
- [ ] with the same setting, `https://automatic-panorama-toonrzs-projects.vercel.app.evil.com`,
      `https://other-git-test-toonrzs-projects.vercel.app`, and
      `http://automatic-panorama-git-test-toonrzs-projects.vercel.app` are
      rejected;
- [ ] an invalid regular expression fails at startup with a message naming
      `BACKEND_CORS_ORIGIN_REGEX`, rather than at the first request;
- [ ] `render.yaml` declares the variable with `sync: false` and no value;
- [ ] `make test` and `make lint` are green.
