# Task 08f - dev mode, stage keys, and contract snapshots

- Owner: TBD
- Reviewers: TBD
- Depends on: none
- Spec: `docs/integration-spec.md` sections 9, 2 (G12-G15)

## Scope

Make the local dev server talk to the real backend by default, teach the
frontend the `encode` stage, and add committed snapshots of real API responses
that both sides test against. Widen the error `context` schema to what the
handlers already emit.

Lands first: 08a-08e use these snapshots as fixtures.

## Files

- `frontend/package.json` - add `dev:mock`
- `frontend/vite.config.ts` - mock mode define, production build guard
- `frontend/src/constants/pipeline.ts` - seven stages
- `backend/scripts/export_contract_snapshots.py` - new
- `Makefile` - `contract-snapshots` target
- `frontend/src/fixtures/contract/*.json` - new, generated
- `frontend/src/fixtures/index.ts` - derive fixtures from snapshots
- `frontend/src/fixtures/contract.test.ts` - new
- `backend/app/tests/test_contract_snapshots.py` - new
- `backend/app/schemas/stitch.py` - `ErrorDetail.context`
- `docs/ui-spec.md` sections 5 and 10, `README.md` local workflow

## Acceptance

- [x] `npm run dev` sends a real request to `VITE_API_BASE_URL`; `npm run dev:mock`
      sends none and shows the state switcher;
- [x] `vite build` with `VITE_MOCK_API=true` in production mode exits non-zero;
- [x] `PIPELINE_STAGES` has seven keys in backend order, and the stage chart for
      `stitch-success.json` renders no unknown row;
- [x] `make contract-snapshots` writes the four files in spec section 9.3, and
      rerunning it without code changes produces no diff other than timings;
- [x] renaming a diagnostics key in `services/stitcher.py` without regenerating
      makes `test_contract_snapshots.py` fail with a message naming the file;
- [x] `contract.test.ts` validates each snapshot's shape and renders `complete`
      and `failed` from them;
- [x] `successWithOverlayFixture` and `insufficientInliersError` are derived
      from snapshots; the existing frontend tests still pass;
- [x] `ErrorDetail.context` accepts `list[int]`;
- [x] `README.md` says to delete a stale `VITE_MOCK_API` line from
      `frontend/.env.development.local`.
