# Roadmap

The roadmap is organized as tracer-bullet slices: each phase leaves a runnable
vertical path and produces evidence that can be merged independently.

## Phase 0 - scaffold and contract (current)

Exit criteria:

- repository guidance, assignment mapping, and five-person ownership are
  committed;
- FastAPI health route, upload contract, frontend shell, tests, CI, and local
  instructions exist;
- Render/Vercel deployment configuration is documented but not yet claimed as
  live;
- `/api/v1/stitch` returns an honest `501` until implementation lands;
- the backend contract is specified in full in `docs/backend-spec.md`, and the
  ten implementation slices are planned under
  `task-plans/07-backend-pipeline.md`.

## Phase 1 - pairwise CV baseline

Owner: CV core + QA. Slices `07a`, `07d`, `07e`, `07f`. Deliver a local
function that takes two synthetic overlapping images and returns a Homography,
inlier mask, and reprojection metrics.

Exit criteria:

- SIFT and ORB use one feature interface;
- ratio test and detector-appropriate matcher are covered by tests;
- RANSAC rejects an intentionally bad correspondence set;
- inlier match visualization is saved for review.

## Phase 2 - multi-image composition

Owners: CV core + backend. Slices `07b`, `07c`, `07g`, `07h`. Add ordering and
reference selection, transform composition, the per-request input budget,
canvas calculation, and perspective warping for three images.

Exit criteria:

- two-image and three-image golden cases pass;
- disconnected or weak images fail with diagnostics;
- output size is bounded and no intermediate is silently persisted.

## Phase 3 - blending and result contract

Owners: CV core + backend + frontend. Slices `07i` and `07j`, plus the `04`
family. Add masks, feather blending, crop and encode, and the JSON/image
response consumed by the UI. `07j` is where the 501 goes away.

Exit criteria:

- seam quality is demonstrated on an overlapping test set;
- result UI shows output plus inlier/match diagnostics;
- API errors have stable codes and actionable messages.

## Phase 4 - productization and public deployment

Owners: frontend + deployment/QA. Complete upload UX, loading/cold-start
messaging, CORS, Render health check, Vercel environment, and public smoke test.

Exit criteria:

- public frontend can reach the public backend;
- SIFT/ORB selection and a bad-input case work from the URL;
- deployment does not rely on a local filesystem or secret.

## Phase 5 - submission hardening

Owners: coordinator/release + all members.

Exit criteria:

- `requirements.txt` and fresh-clone instructions verified;
- CI green on the submission commit;
- exact demo assets and licenses recorded;
- five merged PRs or more, one per member, are attributable;
- 10-minute recording is timed, balanced, and includes an edge case;
- README contains the public URL and a concise method explanation.

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
