# Roadmap

The roadmap is organized as tracer-bullet slices: each phase leaves a runnable
vertical path and produces evidence that can be merged independently.

## Phase 0 - scaffold and contract (complete)

Exit criteria:

- repository guidance, assignment mapping, and five-person ownership are
  committed;
- FastAPI health route, upload contract, frontend shell, tests, CI, and local
  instructions exist;
- Render/Vercel deployment configuration is documented but not yet claimed as
  live;
- the backend contract is specified in full in `docs/backend-spec.md`, and all
  ten implementation slices under `task-plans/07-backend-pipeline.md` are
  merged; `/api/v1/stitch` runs the real pipeline.

## Phase 1 - pairwise CV baseline (complete)

Owner: CV core + QA. Slices `07a`, `07d`, `07e`, `07f`. Deliver a local
function that takes two synthetic overlapping images and returns a Homography,
inlier mask, and reprojection metrics.

Exit criteria:

- SIFT and ORB use one feature interface;
- ratio test and detector-appropriate matcher are covered by tests;
- RANSAC rejects an intentionally bad correspondence set;
- inlier match visualization is saved for review.

## Phase 2 - multi-image composition (complete)

Owners: CV core + backend. Slices `07b`, `07c`, `07g`, `07h`. Add ordering and
reference selection, transform composition, the per-request input budget,
canvas calculation, and perspective warping for three images.

Exit criteria:

- two-image and three-image golden cases pass;
- disconnected or weak images fail with diagnostics;
- output size is bounded and no intermediate is silently persisted.

## Phase 3 - blending and result contract (complete)

Owners: CV core + backend + frontend. Slices `07i` and `07j`, plus the `04`
family. Add masks, feather blending, crop and encode, and the JSON/image
response consumed by the UI. `07j` is where the live route was connected.

Exit criteria:

- seam quality is demonstrated on an overlapping test set;
- result UI shows output plus inlier/match diagnostics;
- API errors have stable codes and actionable messages.

## Phase 4 - productization and public deployment

Owners: frontend + deployment/QA. Complete upload UX, loading/cold-start
messaging, CORS, Render health check, Vercel environment, and public smoke test.
Execution is `task-plans/09-production-deploy.md` against the production spec
in `docs/deployment-plan.md`.

The Graphite visual redesign is `task-plans/10-graphite-redesign.md`, specified
in `docs/ui-spec.md` sections 2, 3, and 6.4. It changes presentation and layout
only; the API contract and the stitch state machine are untouched.

Exit criteria:

- public frontend can reach the public backend;
- SIFT/ORB selection and a bad-input case work from the URL;
- deployment does not rely on a local filesystem or secret;
- the backend stays awake under the keep-alive monitor and every item in
  `docs/deployment-plan.md` section 9 has evidence.

Status on 2026-09-28: in progress.

- Reaching the backend: the production bundle calls the Render API, and CORS
  admits the production origin (`docs/deployment-plan.md` section 10).
- SIFT/ORB and bad input: the sample gallery's failure sets make the
  bad-input case one click (`docs/ui-spec.md` section 3.3). No stitch from
  the public URL is recorded yet; that is 09e's manual pass.
- No local filesystem or secret: holds, since v1 is stateless.
- Keep-alive and section 9: open (09d, 09e).

Work added in this phase beyond the plan: the intro cover, the sample
gallery, the feature survival funnel, and the one-row stage toolbar
(`docs/ui-spec.md` sections 3.2, 3.3, 6.6, and 3.1). Their departures from the
spec are listed in `docs/ui-spec.md` section 13.

## Phase 5 - submission hardening

Owners: coordinator/release + all members.

Exit criteria:

- `requirements.txt` and fresh-clone instructions verified;
- CI green on the submission commit;
- exact demo assets and licenses recorded;
- five merged PRs or more, one per member, are attributable;
- 10-minute recording is timed, balanced, and includes an edge case;
- README contains the public URL and a concise method explanation.

Status on 2026-09-28: not started as a phase. Progress against each criterion:

- CI is green on `main` (`9ff021a`).
- Demo assets are recorded in `docs/demo-script.md`, but the licence of the
  three OpenCV photo sets is unstated upstream and the team has not decided
  what to do about it.
- Merged pull requests come from four GitHub accounts: ToonRz,
  thikamporntuamkaew, pattarathidacharujitchamroen-bit, and bosschaisit.
  Check that list against the five members in `docs/contribution-plan.md`.
- The README has the public URL and a method overview.
- The recording has not been made.

## Suggested cadence

| Week | Focus | Milestone |
| --- | --- | --- |
| 1 | Phase 0 + pairwise spike | local skeleton and feature/match notebook or test evidence |
| 2 | Phase 1 | robust two-image baseline |
| 3 | Phase 2 | three-image warp and diagnostics |
| 4 | Phase 3 | blended result in local UI |
| 5 | Phase 4 | public URL and smoke test |
| 6 | Phase 5 | demo rehearsal, cleanup, submission |

Re-plan after each milestone using observed latency and failure cases rather
than adding speculative infrastructure.
