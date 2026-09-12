# Task 08 - integration and user readiness

- Owner: TBD (integration)
- Spec: `docs/integration-spec.md`

This task is a parent. It closes the gaps between the live backend and the
frontend listed in section 2 of the spec, and removes course and hosting text
from everything a user can see. Each child is its own pull request. This file
is closed only when every child is merged.

## Children

Merge in the order listed. 08f goes first because the other slices test against
its contract snapshots.

| Order | Slice | File | Gaps | Owner | Depends on |
| --- | --- | --- | --- | --- | --- |
| 1 | 08f dev mode, stage keys, contract snapshots | `08f-dev-mode-and-contract-snapshots.md` | G12-G15 | TBD | none |
| 2 | 08a user-facing copy cleanup | `08a-copy-cleanup.md` | G1, G2 | TBD | 08f |
| 3 | 08b client config and pre-flight validation | `08b-config-and-preflight.md` | G3, G4 | TBD | 08f |
| 4 | 08c image preparation and pixel ceiling | `08c-image-preparation.md` | G5-G7 | TBD | 08b |
| 5 | 08d errors that name frames | `08d-error-ux.md` | G8-G10 | TBD | 08b |
| 6 | 08e request timeout and cancel | `08e-timeout-and-cancel.md` | G11 | TBD | 08d |
| 7 | 08g public deployment and smoke evidence | `08g-deploy-and-smoke.md` | G16 | TBD | all of the above |

08a and 08b may run in parallel after 08f. 08c and 08d may run in parallel
after 08b.

## Parent acceptance

- [x] all seven children merged (as commits directly on `main`, per this
      repository's workflow for this pass — see each child file for its
      commit);
- [x] every row of section 2 of `docs/integration-spec.md` is closed by a
      merged slice;
- [ ] every requirement I1-I17 in section 11 has a test or recorded evidence
      linked from its slice's pull request — true for I1-I16; I17 (the public
      URL passes section 10's scripted and manual checks) is only partly
      closed: `scripts/smoke_public.py` exists and passes locally, but no
      public Render/Vercel URL exists yet in this environment, so the
      scripted-against-production and manual real-photo/HEIC/cold-start
      checks remain open (`task-plans/08g-deploy-and-smoke.md`);
- [x] `docs/ui-spec.md` and `docs/backend-spec.md` no longer contradict the
      integration spec;
- [x] `make test`, `make lint`, and `make frontend-build` are green on `main`.
