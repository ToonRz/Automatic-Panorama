# Task 08c - image preparation and pixel ceiling

- Owner: TBD
- Reviewers: TBD
- Depends on: 08b
- Spec: `docs/integration-spec.md` section 6, 5.2, 2 (G5-G7)

## Scope

Downscale frames in the browser to the per-count budget from `/config` before
upload, applying EXIF orientation and re-encoding to JPEG when needed. Add the
`preparing` screen state. Raise the backend `max_image_pixels` default to 50 MP
so an unprepared 12 MP or 48 MP upload is also accepted.

## Files

- `frontend/src/utils/prepareImage.ts` - new, plus test
- `frontend/src/constants/preparation.ts` - new: `PREPARED_JPEG_QUALITY`,
  `CLIENT_MAX_ORIGINAL_MB`, `BACKEND_ACCEPTED_TYPES`
- `frontend/src/hooks/useStitchRun.ts` - `preparing` state, prepared uploads
- `frontend/src/api.ts` - upload prepared blobs with their upload names
- `frontend/src/components/ControlRail/ControlRail.tsx`, `FileList.tsx`
- `frontend/src/components/OutputCanvas/OutputCanvas.tsx`
- `frontend/src/dev/debugStates.ts` - add `preparing`
- `backend/app/core/config.py`, `backend/.env.example`, `render.yaml`
- `backend/app/tests/test_decode_and_downscale.py`
- `docs/ui-spec.md` section 4, `docs/backend-spec.md` sections 5.1, 9, 10

## Acceptance

- [x] `preparing` renders the `ready` placeholder with a disabled
      "Preparing images…" button, and is announced once;
- [x] a new selection during preparation abandons the old run (test with a
      delayed decode);
- [x] a frame within budget and of an accepted type is uploaded byte-identical;
- [x] a 4032x3024 frame in a three-frame selection is uploaded at 1600x1200 as
      JPEG, and the row shows `4032×3024 → 1600×1200`;
- [x] a JPEG with EXIF orientation 6 is uploaded upright (verified with a real
      browser in the pull request, since jsdom has no canvas);
- [x] a file whose decode throws is marked invalid with the section 6.3 message
      and is not sent;
- [x] prepared sizes, not original sizes, feed the section 5.2 checks and the
      upload total;
- [x] a backend test uploads a synthetic 4032x3024 image and receives 200;
- [x] `max_image_pixels` default is 50 000 000 in all three config locations;
- [x] real-browser evidence: a 12.19 MP (4032x3024) set stitches successfully
      end-to-end against the real backend, and a HEIC file in Chrome is marked
      invalid (`docs/screenshots/08c-chrome-heic-invalid.png`). HEIC in Safari
      could not be verified in this environment (no Safari available) — this
      remains a human task.
