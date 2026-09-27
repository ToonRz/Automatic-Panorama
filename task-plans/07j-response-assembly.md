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

Status: shipped as `06f90f5` (pipeline) and `161c687` (scaffold removal)
directly on `main`, with no pull request. Boxes checked on 2026-09-28 against
`main` at `9ff021a` (CI run 36341167597: 106 Pytest tests green).

- [x] every field in spec section 7 is present in a real 200 response captured
      in the pull request, with its diagnostics JSON attached;
      Evidence: with no pull request, the capture lives in the repository:
      `frontend/src/fixtures/contract/stitch-success.json`, exported from the
      real FastAPI app by `make contract-snapshots`.
      `test_end_to_end.py::test_full_response_has_every_spec_section_7_field`
      and `test_contract_snapshots.py` hold both to the spec.
- [x] all per-pair arrays are the same length, equal to `image_count - 1`;
      Evidence: `test_end_to_end.py::test_per_pair_arrays_all_have_image_count_minus_one_entries`.
- [x] `stage_timings_ms` carries all seven keys and their sum is within 10
      percent of the measured request duration;
      Evidence: `test_end_to_end.py::test_stage_timings_has_all_seven_keys_and_sums_near_total_duration`.
- [x] every code in spec section 9 is raised by at least one contract test,
      with the context keys that table lists;
      Evidence: every code in the spec section 9 table is raised by at least
      one test. Most go through the route (`test_request_gates.py`,
      `test_end_to_end.py`). `IMAGE_TOO_MANY_PIXELS` and
      `EXCESSIVE_REPROJECTION_ERROR` are raised only at unit level
      (`test_decode_and_downscale.py`, `test_homography.py`).
- [x] an unexpected exception produces a 500 envelope, never a stack trace;
      Evidence: `test_end_to_end.py::test_unexpected_exception_produces_a_500_envelope_never_a_stack_trace`.
- [x] `PIPELINE_NOT_IMPLEMENTED` is gone from the route, the tests, and
      `docs/api-contract.md`;
      Evidence: no occurrence remains in `backend/`, `frontend/src/`, or
      `docs/api-contract.md`.
- [x] the scaffold state is removed from the frontend in this pull request;
      Evidence: removed in `161c687`, the commit after the pipeline landed.
- [ ] `docs/mockups/backend-design.html` is regenerated to match the spec, and
      its supersession banner is removed;
      **Not done.** The file still opens with `<div class="banner superseded">`
      pointing readers at `docs/backend-spec.md`, and was last changed in
      `a69e6fa`.
- [x] `task-plans/01`, `02`, and `03` are marked complete, and
      `docs/roadmap.md` phases 1 to 3 are checked off;
      Evidence: `59a992a`; each of those files reads "Status: complete", and
      `docs/roadmap.md` marks phases 0-3 "(complete)".
- [x] a fresh clone runs `make install && make test` green.
      Evidence: CI installs from a fresh checkout on every push and runs the
      same Pytest and Vitest suites green (run 36341167597).
