# Task 06 - overlay geometry in the diagnostics contract

- Owner: Member C
- Reviewers: Member B, Member D
- Branch: `feature/06-overlay-diagnostics`
- Depends on: Tasks 02 and 03
- Spec: `docs/ui-spec.md` section 6.2

## Scope

The UI draws the seam and inlier overlay itself, which needs geometry the
success response does not currently carry. Add two fields to `diagnostics`.
Member B supplies the values from the geometry stage; Member C carries them
through the schema and the response.

Both fields are in output-image pixel coordinates, the same space as
`image.width` and `image.height`, so the frontend draws them directly. The
transform arithmetic stays in `backend/app/cv/`.

| Field | Shape | Notes |
| --- | --- | --- |
| `seam_positions_x` | list of numbers, one per pair | x of the vertical seam on the output canvas |
| `sample_correspondences_per_pair` | list per pair of at most 12 point pairs | a drawn illustration, not the inlier set |

The sample field is named for what it is. Nothing downstream may count it; the
inlier count is `inliers_per_pair` and nowhere else.

## Acceptance

- [ ] both fields are added to the response schema and to
      `docs/api-contract.md`, which currently marks them pending;
- [ ] lengths match the pair count, which is the image count minus one;
- [ ] sampling is capped at 12 per pair and is deterministic for a given input,
      so a rerun during the demo does not redraw different points;
- [ ] every coordinate falls inside the output canvas bounds;
- [ ] the fields are optional in the frontend types, and a response without them
      still renders;
- [ ] API tests cover the field shapes and the bounds;
- [ ] `frontend/src/types.ts` is updated in the same pull request.
