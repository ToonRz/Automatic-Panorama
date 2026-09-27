# Task 05 - CI, deployment, and submission evidence

- Owner: Member E
- Reviewers: Member C, Member D
- Depends on: scaffold; final API/UI for public smoke test

The deployment, CORS/cold-start/stateless smoke test, and public-URL bullets
this task originally owned moved to `task-plans/08g-deploy-and-smoke.md`
(`docs/integration-spec.md` section 1.2), once the pipeline and the
integration slices were far enough along to make a real deploy worth doing.
This task keeps CI.

## Acceptance

- [x] GitHub Actions runs backend tests/lint and frontend typecheck, tests,
      and build;
      Evidence: `.github/workflows/ci.yml` — `backend` runs Ruff and Pytest;
      `frontend` runs `npm run lint` (tsc -b), `npm run build`, and
      `npm test` (Vitest, including the A12 `build-exclusion` test).
- [ ] demo timer and contribution evidence are ready.
      **Open on 2026-09-28.** Every box in the `docs/demo-script.md`
      rehearsal checklist is still unchecked, and the licence decision for
      the demo photo sets (that file, "Demo image sources and licences") is
      unmade.

See `task-plans/09-production-deploy.md` for Render/Vercel deployment, the
scripted and manual smoke checks, and the public URLs. It supersedes 08g.
