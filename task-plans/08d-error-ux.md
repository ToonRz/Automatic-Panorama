# Task 08d - errors that name frames

- Owner: TBD
- Reviewers: TBD
- Depends on: 08b
- Spec: `docs/integration-spec.md` section 7, 2 (G8-G10)

## Scope

Name frames by one-based number and file name in every error heading, context
chip, and diagnostics view, and highlight the rows an error names. Add remedies
for every failure the client can reach, split network failures by server
availability, detect proxy errors without a JSON envelope, and implement the
`SERVICE_BUSY` countdown.

## Files

- `frontend/src/utils/frameLabel.ts` - new, plus test
- `frontend/src/constants/remedies.ts`, `remedies.test.ts`
- `frontend/src/api.ts` - classify non-envelope and network failures
- `frontend/src/hooks/useStitchRun.ts` - busy countdown, availability-aware
  network codes
- `frontend/src/components/OutputCanvas/FailedState.tsx`
- `frontend/src/components/ControlRail/ControlRail.tsx`, `FileList.tsx`
- `frontend/src/components/Diagnostics/Diagnostics.tsx`, `PairTable.tsx`
- `docs/ui-spec.md` sections 7 and 7.1

## Acceptance

- [ ] the `error-insufficient-inliers.json` snapshot renders a heading with
      both frame numbers and file names, one-based `pair` chip values, and both
      rows highlighted in the file list;
- [ ] diagnostics order and pair cells are one-based, with file names in the
      pair cell `title`;
- [ ] each of `UNEXPECTED_ERROR`, `NETWORK_ERROR`, `SERVER_UNREACHABLE`,
      `UPSTREAM_UNAVAILABLE`, `UNKNOWN_ERROR`, and `REQUEST_TIMEOUT` renders its
      section 7.2 remedy;
- [ ] a 502 with an HTML body maps to `UPSTREAM_UNAVAILABLE`;
- [ ] a rejected `fetch` maps to `SERVER_UNREACHABLE` when the pill is `waking`
      or `offline`, otherwise `NETWORK_ERROR`;
- [ ] a test iterates every code in backend spec section 9 and section 7.2 and
      asserts none renders the generic remedy;
- [ ] `SERVICE_BUSY` with `retry_after_seconds: 2` shows `Try again in 2s`,
      then `1s`, then re-enables, with fake timers and no request sent;
- [ ] screenshots of a pair error with highlighted rows, and the busy
      countdown.
