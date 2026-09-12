# API contract

Moved. The request lifecycle, success response, diagnostics fields, error
catalogue, and settings now live in one place:

**`docs/backend-spec.md`**

| Looking for | Section |
| --- | --- |
| `GET /healthz`, `GET /api/v1/config`, `POST /api/v1/stitch` | 6 |
| success response and every diagnostics field | 7 |
| overlay geometry the result UI draws | 8 |
| all eighteen error codes, statuses, and context keys | 9 |
| settings, defaults, and ranges | 10 |

This file stays as a pointer because `docs/ui-spec.md` links to it. Do not add
contract detail here; it will drift from the specification within a week, which
is exactly how the two documents came to disagree in the first place.

Two things changed shape when the contract was consolidated, and are called out
so a reader arriving from an older document is not misled:

- `seam_positions_x` no longer exists. Seam geometry is `seam_lines`, a
  two-point line per pair. See `docs/backend-spec.md` section 8.
- the overlay fields are no longer pending. They are part of the response
  contract, owed by `task-plans/07h` and `task-plans/07i`.
