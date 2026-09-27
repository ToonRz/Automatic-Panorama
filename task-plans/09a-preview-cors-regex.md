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

Status: complete. Merged as PR #2 (`03518ba`). Boxes checked on 2026-09-28
against `main` at `9ff021a` (CI run 36341167597 green). Tests named below are
in `backend/app/tests/test_cors.py`.

- [x] with the setting unset, CORS behaviour is unchanged: the configured exact
      origin gets `access-control-allow-origin`, and any other origin does not;
      Evidence: `test_unset_regex_keeps_exact_origin_behaviour_unchanged`.
- [x] with the setting `^https://automatic-panorama-[a-z0-9-]+-toonrzs-projects\.vercel\.app$`
      (a stand-in for the real names), a preflight and a simple `GET /healthz`
      from `https://automatic-panorama-git-test-toonrzs-projects.vercel.app`
      are allowed;
      Evidence: `test_regex_allows_a_matching_preview_origin`. Production
      answered that origin's preflight with `access-control-allow-origin` on
      2026-09-28 (`docs/deployment-plan.md` section 10).
- [x] with the same setting, `https://automatic-panorama-toonrzs-projects.vercel.app.evil.com`,
      `https://other-git-test-toonrzs-projects.vercel.app`, and
      `http://automatic-panorama-git-test-toonrzs-projects.vercel.app` are
      rejected;
      Evidence: `test_regex_rejects_lookalike_and_wrong_scheme_origins`.
- [x] an invalid regular expression fails at startup with a message naming
      `BACKEND_CORS_ORIGIN_REGEX`, rather than at the first request;
      Evidence: `test_invalid_regex_fails_at_startup_naming_the_setting`.
- [x] `render.yaml` declares the variable with `sync: false` and no value;
      Evidence: `render.yaml`, `BACKEND_CORS_ORIGIN_REGEX` with `sync: false`.
- [x] `make test` and `make lint` are green.
      Evidence: CI run 36341167597.
