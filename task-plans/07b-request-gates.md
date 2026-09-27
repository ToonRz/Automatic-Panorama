# Task 07b - request gates, settings, and concurrency

- Owner: Member C
- Reviewers: Member A, Member E
- Depends on: 07a
- Spec: `docs/backend-spec.md` sections 3, 4, 5.1, 6, 9, 10

## Scope

Bring the route up to the specified admission check and gates 0 through 3, and
add every new setting. Adds `TOTAL_UPLOAD_TOO_LARGE`, `SERVICE_BUSY`, and
`STITCH_TIMEOUT` to the envelope, widens `/api/v1/config` to its nine fields,
and converts the stitch handler from `async def` to `def` so future OpenCV work
runs in the threadpool instead of on the event loop.

The route still returns 501 after gate 3. This slice changes what happens
before that line, never what replaces it.

## Acceptance

Status: shipped with the pipeline in `06f90f5` directly on `main`, with no
pull request. Boxes checked on 2026-09-28 against `main` at `9ff021a` (CI run
36341167597: 106 Pytest tests green).

- [x] gate 0 rejects a request whose total bytes exceed
      `max_total_upload_mb` before any file is fully read;
      Evidence: `app.main` middleware checks `Content-Length`;
      `test_request_gates.py::test_gate0_total_upload_too_large`.
- [x] every context key listed in spec section 9 for gates 0-3 is present in
      the raised envelope, with zero-based indices;
      Evidence: `core/errors.py` builds every gate 0-3 context with the keys
      spec section 9 lists (`total_mb`/`limit_mb`, `received`/`required` or
      `limit`, `image`/`content_type`, `image`/`size_mb`/`limit_mb`,
      `field`/`value`). The gate tests assert the full dictionary for gates 1
      and 2 and a subset for gate 0, `IMAGE_TOO_LARGE`, and gate 3.
- [x] the stitch handler is a plain `def`, and a test proves `/healthz`
      answers within 200 ms while a slow stitch occupies the worker;
      Evidence: `api/routes.py` `def stitch_images`;
      `test_healthz_answers_quickly_while_a_slow_stitch_occupies_the_worker`.
- [x] a second concurrent stitch receives `SERVICE_BUSY` 503 with
      `retry_after_seconds`, and does not queue;
      Evidence: `test_service_busy_when_the_single_stitch_slot_is_held`.
- [x] `stitch_timeout_seconds` produces `STITCH_TIMEOUT` 504, and the docstring
      states that the worker thread is not cancelled;
      Evidence: `test_end_to_end.py::test_stitch_timeout_when_the_injected_clock_reports_an_overrun`;
      the `services/stitcher.py` docstring says the worker thread cannot be
      cancelled once started.
- [x] `/api/v1/config` returns exactly the nine fields in spec section 6.2,
      including the `max_input_long_edge_by_count` table;
      Evidence: `test_health.py::test_client_config_exposes_exactly_the_nine_spec_fields`.
      The production API returned the same nine fields on 2026-09-28.
- [x] every setting in spec section 10 exists in `core/config.py` with the
      stated default and range, and every one is reachable by an environment
      variable;
      Evidence: all 21 settings in `core/config.py` match spec section 10's
      defaults and ranges, as fields of a `pydantic-settings` class.
- [x] `render.yaml` lists the new environment variables;
      Evidence: `render.yaml` declares all 21, from `APP_ENV` to
      `MAX_CONCURRENT_STITCHES`.
- [x] contract tests cover each gate 0-3 code.
      Evidence: `test_request_gates.py` covers `TOTAL_UPLOAD_TOO_LARGE`,
      `TOO_FEW_IMAGES`, `TOO_MANY_IMAGES`, `UNSUPPORTED_IMAGE_TYPE`,
      `EMPTY_IMAGE`, `IMAGE_TOO_LARGE`, and `INVALID_STITCH_SETTINGS` (for
      the detector and for the ratio).
