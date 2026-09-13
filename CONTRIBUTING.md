# Contributing to Automatic Panorama Stitcher

This guide keeps a five-person student project easy to review, easy to demo,
and easy to grade. Every contribution should leave the repository more
reproducible than it found it.

## Before starting

1. Read [docs/assignment-alignment.md](docs/assignment-alignment.md).
2. Check [docs/contribution-plan.md](docs/contribution-plan.md) for the owner
   of the slice you want to change.
3. Create or update a task under `task-plans/` before a non-trivial change.
4. Do not use private or unlicensed photographs in commits, tests, screenshots,
   or the public deployment.

## Branching strategy

Long-lived branches:

| Branch | Purpose | Merge gate |
| --- | --- | --- |
| `main` | Stable public demo/submission | PR, one approval, CI green |
| `test` | QA and deployment rehearsal | PR, CI green, smoke test |
| `develop` | Integration branch for completed slices | PR, CI green |

### Merging into `test` and `main`

ToonRz merges every PR into `test` and into `main` using GitHub's
**"Create a merge commit"** option, never squash or rebase merge. This is not
a style preference: on the Vercel Hobby plan, a private repository's
Production and Preview deployments are only built from a commit authored by
the Hobby team owner (`docs/deployment-plan.md` section 4.1). A squash or
rebase merge rewrites the commit and keeps the original PR author, which
Vercel then refuses to deploy. A merge commit is authored by whoever clicks
merge, so ToonRz merging with "Create a merge commit" is what keeps the
`test` branch Preview and the `main` Production deploy alive regardless of
who authored the underlying feature branch.

Short-lived branches are cut from `develop` and deleted after merge:

| Prefix | Use |
| --- | --- |
| `feature/` | New CV, API, or UI capability |
| `fix/` | A reproducible defect |
| `test/` | Tests, fixtures, or evaluation harness |
| `docs/` | Documentation, diagrams, or demo materials |
| `chore/` | Dependencies, formatting, or repository maintenance |
| `deploy/` | Hosting, CI, or release configuration |

Use lowercase kebab-case and an issue/slice number when available:

```text
feature/03-sift-feature-extraction
feature/07-multi-image-composition
fix/12-orb-hamming-matcher
docs/15-demo-script
deploy/18-render-health-check
```

## Typical workflow

```text
task plan -> short-lived branch -> small commits -> PR -> review + CI
                                                     |
                                                     v
                                              develop -> test -> main
```

1. Sync the base branch and create one focused branch.
2. Make the smallest vertical change that can be tested.
3. Run `make test`, `make lint`, and `make frontend-build` when relevant.
4. Rebase or merge the latest `develop` before opening the PR if the branch is
   stale.
5. Open a PR with the template. Ask the owner of the affected slice for
   review; ask the QA/deployment owner for changes that affect demo output or
   hosting.
6. Merge only when CI is green, the required reviewer approves, and the PR
   includes evidence.
7. Delete the branch after merge and update the task/roadmap.

## Pull-request checklist

- [ ] The PR has one clear purpose and names its owner.
- [ ] The relevant task-plan file is linked.
- [ ] Tests cover the changed behavior or explain why no test is possible.
- [ ] `make test` and `make lint` pass; frontend changes also pass
      `make frontend-build`.
- [ ] CV changes report the detector, ratio threshold, RANSAC threshold, and
      inlier acceptance criteria.
- [ ] UI/output changes include a screenshot or a short local recording.
- [ ] No secrets, `.env` files, private images, or generated output are added.
- [ ] Public API or deployment changes update the relevant docs.
- [ ] The five-person demo/contribution record remains balanced.

## Commit messages

Use Conventional Commits. Keep the subject imperative, lowercase, and under
72 characters with no final period.

```text
feat(cv): add ratio-tested descriptor matcher
fix(api): reject uploads with too few images
test(cv): add synthetic homography regression case
docs(deploy): document Render free sleep behavior
build(frontend): pin Vite build configuration
```

One logical change per commit is preferred. Explain motivation and tradeoffs in
the body when a threshold, API shape, or hosting decision changes.

## Ownership and review

The full matrix is in [docs/contribution-plan.md](docs/contribution-plan.md).
At minimum:

- CV core changes need the CV owner plus QA review.
- API/validation changes need the backend owner plus CV or QA review.
- UI changes need the frontend owner plus demo/release review.
- Deployment/CI changes need the deployment owner plus backend review.
- Assignment, roadmap, and demo documents need the coordinator/release owner
  plus the person who will present them.

No member should be the sole author and sole approver of a change that affects
their own demo evidence.

## Issues and bugs

An actionable issue includes expected behavior, actual behavior, reproduction
steps, sample input description, environment, and relevant logs. Report any
security or privacy concern privately to the team rather than placing uploaded
images, credentials, or personal data in a public issue.

## Data and licensing

Use generated fixtures, public-domain images, or images whose license is
recorded in `docs/` for all repository and demo assets. The public deployment
must not retain uploaded files. If a future feature needs persistence, update
the threat/data model and deployment plan first.
