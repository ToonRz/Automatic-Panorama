# Five-person contribution plan

The assignment explicitly requires five members and penalizes missing member
contributions in the presentation. The plan gives every person a distinct
vertical slice, a review responsibility, and a timed demo segment.

## Ownership matrix

| Member | Primary ownership | Deliverables | Reviews |
| --- | --- | --- | --- |
| A - CV lead | Feature extraction, descriptor matching, ratio test | `cv/features.py`, `cv/matching.py`, pairwise metrics/tests | B and E review algorithm contracts |
| B - Geometry/blending | Homography/RANSAC, transform composition, warp, blend | `cv/homography.py`, `cv/warping.py`, `cv/blending.py`, golden outputs | A and E review numerical behavior |
| C - Backend/API | FastAPI routes, validation, service orchestration, response errors | `api/`, `services/`, schemas, API tests, Render runtime | A reviews pipeline integration; E reviews deploy compatibility |
| D - Frontend/product | Upload UX, previews, result/diagnostics UI, accessibility | `frontend/src/`, API client, UI tests/evidence | C reviews API integration; E reviews demo flow |
| E - QA/deployment/release | CI, fixtures, smoke tests, Vercel/Render, README/demo evidence | `.github/`, `render.yaml`, deployment docs, release checklist | C reviews runtime; A/B review test coverage |

The coordinator/release role rotates between members A-E for weekly meeting
notes, but it does not replace the primary ownership above. If the team uses
real names, record them in a private course document or replace the labels in a
single reviewed PR; do not put personal contact data in the public repository.

## Vertical slices

Each slice should be mergeable and demonstrable:

1. A: synthetic pair -> keypoints/descriptors -> ratio-passed matches.
2. B: matched points -> RANSAC Homography -> warped pair -> blended output.
3. C: uploaded files -> validated service call -> typed result/error.
4. D: browser upload -> progress/error state -> output + diagnostics.
5. E: fresh clone -> CI -> public deployment -> smoke test and submission pack.

## Branch suggestions

```text
feature/01-sift-orb-matching        # A
feature/02-ransac-warp-blend        # B
feature/03-stitch-api               # C
feature/04-upload-result-ui         # D
deploy/05-ci-and-public-smoke       # E
```

Use a new branch per slice, not one branch per person. A member may contribute
to another slice after their own contract is reviewed, but the PR should keep a
single owner and link the dependency.

## Milestone ownership

| Milestone | Driver | Required reviewers | Evidence |
| --- | --- | --- | --- |
| M0 scaffold | E | all | repo map, CI, local run |
| M1 pairwise baseline | A | B, E | match/inlier plot and tests |
| M2 multi-image warp | B | A, C, E | three-image output and diagnostics |
| M3 API/UI integration | C/D | A, B, E | local browser demo and contract tests |
| M4 public deployment | E | C, D | public URL, health and upload smoke test |
| M5 submission | coordinator/release | all | timed video, README, contribution log |

## Contribution evidence

For the final review, keep a small table in the release PR containing:

- member label;
- merged PR number/title;
- primary files or behavior;
- test/evidence link;
- demo speaker timestamp.

This prevents a last-minute claim that “everyone helped” without a verifiable
record, while still allowing pair programming and review to be credited.
