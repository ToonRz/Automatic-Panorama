# Task 07j - response assembly and 501 removal

- Owner: Member C
- Reviewers: Member A, Member B, Member D, Member E
- Depends on: 07a through 07i
- Spec: `docs/backend-spec.md` sections 7, 9, 13

## Scope

The only slice that changes `api/routes.py`. Wire the service into the route,
assemble the full diagnostics payload, map every pipeline exception to its
section 9 code and status, encode the data URL, and delete the 501.

The frontend's scaffold state is removed in this same pull request. Member D
reviews because this is the moment the UI stops being told the pipeline is not
built.

## Acceptance

- [ ] every field in spec section 7 is present in a real 200 response captured
      in the pull request, with its diagnostics JSON attached;
- [ ] all per-pair arrays are the same length, equal to `image_count - 1`;
- [ ] `stage_timings_ms` carries all seven keys and their sum is within 10
      percent of the measured request duration;
- [ ] every code in spec section 9 is raised by at least one contract test,
      with the context keys that table lists;
- [ ] an unexpected exception produces a 500 envelope, never a stack trace;
- [ ] `PIPELINE_NOT_IMPLEMENTED` is gone from the route, the tests, and
      `docs/api-contract.md`;
- [ ] the scaffold state is removed from the frontend in this pull request;
- [ ] `docs/mockups/backend-design.html` is regenerated to match the spec, and
      its supersession banner is removed;
- [ ] `task-plans/01`, `02`, and `03` are marked complete, and
      `docs/roadmap.md` phases 1 to 3 are checked off;
- [ ] a fresh clone runs `make install && make test` green.
