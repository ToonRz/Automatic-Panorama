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

- [ ] gate 0 rejects a request whose total bytes exceed
      `max_total_upload_mb` before any file is fully read;
- [ ] every context key listed in spec section 9 for gates 0-3 is present in
      the raised envelope, with zero-based indices;
- [ ] the stitch handler is a plain `def`, and a test proves `/healthz`
      answers within 200 ms while a slow stitch occupies the worker;
- [ ] a second concurrent stitch receives `SERVICE_BUSY` 503 with
      `retry_after_seconds`, and does not queue;
- [ ] `stitch_timeout_seconds` produces `STITCH_TIMEOUT` 504, and the docstring
      states that the worker thread is not cancelled;
- [ ] `/api/v1/config` returns exactly the nine fields in spec section 6.2,
      including the `max_input_long_edge_by_count` table;
- [ ] every setting in spec section 10 exists in `core/config.py` with the
      stated default and range, and every one is reachable by an environment
      variable;
- [ ] `render.yaml` lists the new environment variables;
- [ ] contract tests cover each gate 0-3 code.
