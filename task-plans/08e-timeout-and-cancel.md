# Task 08e - request timeout and cancel

- Owner: TBD
- Reviewers: TBD
- Depends on: 08d
- Spec: `docs/integration-spec.md` section 8, 2 (G11)

## Scope

Bound every stitch request with a client timeout, add a Cancel button to the
working state, and prove that late responses are ignored. Server work is not
cancelled.

## Files

- `frontend/src/constants/availability.ts` - `COLD_START_ALLOWANCE_MS`,
  `SERVER_STITCH_TIMEOUT_MS`, `RESPONSE_MARGIN_MS`,
  `STITCH_REQUEST_TIMEOUT_MS`
- `frontend/src/api.ts` - accept an `AbortSignal`, distinguish timeout from
  user abort
- `frontend/src/hooks/useStitchRun.ts` - `cancel()`, timeout, cancelled note
- `frontend/src/components/ControlRail/ControlRail.tsx`
- `docs/ui-spec.md` sections 4 and 5

## Acceptance

- [x] `STITCH_REQUEST_TIMEOUT_MS` is derived from the three named constants and
      equals 120 000 at defaults;
- [x] with fake timers, a request that never resolves enters `failed` with
      `REQUEST_TIMEOUT` after the timeout;
- [x] Cancel appears only in `working`, aborts the request, returns to `ready`
      with files and settings intact, and shows the section 8.2 note;
- [x] the note clears on the next submit or selection;
- [x] a 200 resolving after cancel does not change the `ready` state;
- [x] Cancel is reachable by keyboard and has a visible focus ring (the
      page's default `:focus-visible` outline, same as every other control);
- [x] screenshot of the working state with Cancel and of the cancelled note —
      captured against the real backend: submit and Cancel fired back to
      back from the browser console, landing on the `ready` placeholder with
      the section 8.2 note and the original two-file selection intact; the
      run the server kept processing afterwards was confirmed not to
      resurrect the `complete` screen.
