# Task 08b - client config and pre-flight validation

- Owner: TBD
- Reviewers: TBD
- Depends on: 08f
- Spec: `docs/integration-spec.md` sections 4, 5, 2 (G3, G4)

## Scope

Read server policy from `GET /api/v1/config` with a fallback, route every limit
and default through it, and validate a selection in the browser before any
request. Covers the on-selection checks (section 5.1) and the post-preparation
checks (section 5.2) against the original files; 08c later feeds prepared
blobs into the same post-preparation check.

## Files

- `frontend/src/api.ts` - `fetchClientConfig`
- `frontend/src/hooks/useClientConfig.ts` - new, plus test
- `frontend/src/constants/config.ts` - new, `FALLBACK_CONFIG`
- `frontend/src/constants/thresholds.ts` - slider ranges only
- `frontend/src/types.ts` - `ClientConfig`
- `frontend/src/utils/preflight.ts` - new, plus test
- `frontend/src/hooks/useStitchRun.ts`
- `frontend/src/components/ControlRail/ControlRail.tsx`, `Dropzone.tsx`,
  `FileList.tsx`
- `frontend/src/constants/remedies.ts` - remedies take config
- `frontend/src/App.tsx`
- `docs/ui-spec.md` sections 4 and 11

## Acceptance

- [x] config is requested once after the pill first reads `online`, and the
      `config.json` snapshot drives the tests;
- [x] with the config request failing, the page works on `FALLBACK_CONFIG`;
- [x] a config with `max_upload_files: 5` changes the counter, rejects a
      six-file selection with the section 5.1 message, and changes the
      `TOO_MANY_IMAGES` remedy;
- [x] a config arriving after the user moved a slider does not reset it;
- [x] a non-image file and a file over `CLIENT_MAX_ORIGINAL_MB` are marked
      invalid inline, and the button reads "Fix the marked frames";
- [x] no `fetch` to `/api/v1/stitch` happens while any row is invalid;
- [x] pre-flight problems never put the output panel into `failed`;
- [x] screenshots of an invalid row, the over-count message, and the total line
      in its error treatment.
