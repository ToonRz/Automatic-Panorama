# Task 09 - production deployment

- Owner: ToonRz (holds the Vercel, Render, and UptimeRobot accounts)
- Spec: `docs/deployment-plan.md`
- Decisions: D-008, D-009 in `docs/decision-log.md`
- Supersedes: `task-plans/08g-deploy-and-smoke.md`

This task is a parent. It puts the stitcher on a public Vercel frontend and an
always-on Render Free backend, and records the evidence that production is
ready. Each child is its own pull request or its own recorded operation. This
file is closed only when every child is done.

The Render region, the auto-deploy trigger, and this plan were committed with
the task itself, so no child owns them.

## Children

| Order | Slice | File | Spec | Owner | Depends on |
| --- | --- | --- | --- | --- | --- |
| 1 | 09a Preview CORS pattern | `09a-preview-cors-regex.md` | section 5 | TBD | none |
| 1 | 09b memory budget on 512 MB | `09b-memory-budget.md` | section 7 | TBD | none |
| 2 | 09c first production deploy | `09c-first-deploy.md` | sections 3, 4, 8 | ToonRz | 09a, 09b |
| 3 | 09d keep-alive and alerting | `09d-keep-alive.md` | section 6 | ToonRz | 09c |
| 4 | 09e production readiness and rollback drill | `09e-production-readiness.md` | sections 8.1, 9 | ToonRz | 09d |

09a and 09b run in parallel. Both must merge before 09c, because the Render
Blueprint prompts for `sync: false` values only on first creation and the
memory limits must be final before they go public. The TBD slices are open to
members who do not yet have a merged PR (`docs/contribution-plan.md`).

## Parent acceptance

Reviewed on 2026-09-28 against `main` at `9ff021a`.

- [ ] every child is done and linked from the release PR;
      **Open.** 09a is done. 09b has no measurement. 09c is short of the
      auto-deploy trigger, the Vercel Preview check, and the commit-author
      observation. 09d and most of 09e are still open.
- [ ] every item in `docs/deployment-plan.md` section 9 has recorded evidence;
      **Partly.** The section 9.1 CORS check is recorded; the smoke script,
      section 9.2, section 9.3, and section 9.4 are not.
- [ ] `docs/deployment-plan.md` section 10 is filled in, with no secrets;
      **Partly.** It holds the URLs, the CORS values, Render's served commit,
      and the 2026-09-28 checks. The `test` Preview URL, the UptimeRobot
      monitor, and the keep-alive date are still pending.
- [ ] `docs/integration-spec.md` I17 is closed by 09e;
      **Open**, until 09e's smoke run and manual pass are done.
- [x] `make test`, `make lint`, and `make frontend-build` are green on `main`.
      Evidence: CI run 36341167597 on `9ff021a`.
