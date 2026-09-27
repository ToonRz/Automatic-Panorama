# Task 04b - state machine and input rail

- Owner: Member D
- Reviewers: Member C, Member E
- Depends on: 04a, 04e
- Spec: `docs/ui-spec.md` sections 4, 5, 7, 8, 9, 11

## Scope

Introduce `useStitchRun` as the single owner of the seven states, the request,
and the result. Build the control rail: dropzone, file list with previews and
byte total, detector select, both threshold sliders, and the state-dependent
primary button. Build the working, failed, scaffold, and availability screens.
The complete state is a placeholder here and is filled in by 04c and 04d.

## Acceptance

Status: shipped as `5e77218` directly on `main`, with no pull request. Boxes
checked on 2026-09-28 against `main` at `9ff021a` (CI run 36341167597 green).
A box is checked only where the requirement still holds today.

- [x] the seven states in section 4 are exclusive, and no boolean outside the
      hook can put the screen into a state the hook does not report;
      Evidence: `useStitchRun` owns `state`; `App.mock.test.tsx` › "renders
      the state switcher and each state exclusively" (A1).
- [x] changing a threshold or the detector while complete keeps the panorama and
      marks it as produced by the previous settings;
      Evidence: `useStitchRun.test.ts` › "marks a completed result stale when
      a setting changes afterwards…"; `OutputCanvas.test.tsx` › the stale
      chip cases.
- [x] changing the file selection clears the result and the error;
      Evidence: `useStitchRun.test.ts` › "clears the result and error when
      the file selection changes".
- [x] the working screen shows the six stages and no numeric timing;
      Evidence: `OutputCanvas.test.tsx` › "shows the working illustration,
      the Running chip, and no numeric timing anywhere in the panel (A2)"
      (there are seven stages, in the ribbon; no ms or percentage value
      appears).
- [x] every error code in section 7.1 renders its remedy, and an unknown code
      renders the generic one;
      Evidence: `remedies.test.ts` › "returns remedy text for every live and
      owed code in the section 7.1 table…" and "returns the generic remedy
      for an unrecognised code"; `OutputCanvas.test.tsx` (A7).
- [ ] a 501 response renders the scaffold state in amber, not the failed state;
      **Superseded by 07j**: the route no longer returns 501, and the scaffold
      state was removed (`161c687`; `docs/ui-spec.md` section 8).
- [x] the status pill distinguishes checking, waking, online, and offline, and
      retries are bounded;
      Evidence: `useBackendAvailability.test.ts` › "goes online immediately…"
      and "moves to waking on the first failure, then settles on offline
      after bounded retries" (A9).
- [x] a stitch request past the cold-start threshold adds the waking explanation;
      Evidence: `OutputCanvas.test.tsx` › "adds the cold-start note only once
      the threshold has passed".
- [x] thresholds, retry bounds, and file limits are named constants;
      Evidence: `constants/thresholds.ts` and `constants/availability.ts`;
      server file limits come from `ClientConfig` with one `FALLBACK_CONFIG`
      (`task-plans/08b`).
- [x] the output panel announces state changes politely and does not narrate
      stage changes;
      Evidence: the panel stays `aria-live="polite"` (untested directly); the
      no-narration half is covered by `OutputCanvas.test.tsx` ›
      "keeps every ribbon stage pending, and shows no stage card or live
      stage text, after timers advance" — no stage card, and the panel's
      text does not change as timers advance.
- [x] tests cover each state and each transition above;
      Evidence: `useStitchRun.test.ts` (empty → ready → working → complete,
      → failed, stale, selection change, cancel, reset) and one
      `OutputCanvas.test.tsx` case per state.
- [ ] screenshots of empty, ready, working, failed, and scaffold.
      **Not recorded.** The slice had no pull request, and the scaffold state
      no longer exists.
