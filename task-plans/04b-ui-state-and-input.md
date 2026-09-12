# Task 04b - state machine and input rail

- Owner: Member D
- Reviewers: Member C, Member E
- Branch: `feature/04b-ui-state-and-input`
- Depends on: 04a, 04e
- Spec: `docs/ui-spec.md` sections 4, 5, 7, 8, 9, 11

## Scope

Introduce `useStitchRun` as the single owner of the seven states, the request,
and the result. Build the control rail: dropzone, file list with previews and
byte total, detector select, both threshold sliders, and the state-dependent
primary button. Build the working, failed, scaffold, and availability screens.
The complete state is a placeholder here and is filled in by 04c and 04d.

## Acceptance

- [ ] the seven states in section 4 are exclusive, and no boolean outside the
      hook can put the screen into a state the hook does not report;
- [ ] changing a threshold or the detector while complete keeps the panorama and
      marks it as produced by the previous settings;
- [ ] changing the file selection clears the result and the error;
- [ ] the working screen shows the six stages and no numeric timing;
- [ ] every error code in section 7.1 renders its remedy, and an unknown code
      renders the generic one;
- [ ] a 501 response renders the scaffold state in amber, not the failed state;
- [ ] the status pill distinguishes checking, waking, online, and offline, and
      retries are bounded;
- [ ] a stitch request past the cold-start threshold adds the waking explanation;
- [ ] thresholds, retry bounds, and file limits are named constants;
- [ ] the output panel announces state changes politely and does not narrate
      stage changes;
- [ ] tests cover each state and each transition above;
- [ ] screenshots of empty, ready, working, failed, and scaffold.
