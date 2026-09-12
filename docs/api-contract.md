# API contract

The contract is stable before the CV implementation so frontend and backend
work can proceed in parallel.

## Health

`GET /healthz`

```json
{
  "status": "ok",
  "service": "automatic-panorama-api",
  "environment": "development"
}
```

## Stitch request

`POST /api/v1/stitch`

Content type: `multipart/form-data`

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `files` | repeated file | required | 2-8 raster images, max configured bytes per file |
| `detector` | string | `SIFT` | `SIFT` or `ORB` |
| `ratio_threshold` | float | `0.75` | exclusive range 0-1 |
| `ransac_reproj_threshold` | float | `5.0` | positive pixels |

The scaffold validates the request shape and returns:

```json
{
  "detail": {
    "code": "PIPELINE_NOT_IMPLEMENTED",
    "message": "The CV pipeline is scaffolded but not implemented yet."
  }
}
```

with HTTP `501`. This response is intentional and must be replaced only after
the implementation and tests are merged.

## Target success response

HTTP `200`, `application/json`:

```json
{
  "status": "complete",
  "image": {
    "data_url": "data:image/png;base64,...",
    "mime_type": "image/png",
    "width": 2400,
    "height": 720
  },
  "diagnostics": {
    "detector": "SIFT",
    "image_count": 3,
    "image_order": [0, 1, 2],
    "keypoints_per_image": [812, 765, 930],
    "ratio_passed_matches_per_pair": [146, 128],
    "inliers_per_pair": [101, 87],
    "inlier_ratio_per_pair": [0.69, 0.68],
    "reprojection_error_per_pair": [1.42, 1.88],
    "output_width": 2400,
    "output_height": 720,
    "stage_timings_ms": {
      "decode": 31.2,
      "features": 418.5,
      "matching": 12.3,
      "homography": 4.8,
      "warp": 96.4,
      "blend": 83.7
    }
  }
}
```

The exact encoded-image transport may change to a binary response plus a
diagnostic sidecar if profiling shows the JSON/base64 response is too large;
the logical fields remain the same.

## Pending: overlay geometry

The result UI draws the seam and inlier overlay itself, which needs geometry the
response above does not carry. Two optional fields are added to `diagnostics` by
`task-plans/06-overlay-diagnostics-contract.md`. They are specified here so that
frontend work can proceed against them, and they are marked pending until that
task merges.

```json
{
  "seam_positions_x": [806.0, 1608.0],
  "sample_correspondences_per_pair": [
    [{ "from": [742.0, 470.0], "to": [864.0, 508.0] }],
    [{ "from": [1544.0, 486.0], "to": [1672.0, 528.0] }]
  ]
}
```

| Field | Shape | Notes |
| --- | --- | --- |
| `seam_positions_x` | one number per pair | x of the vertical seam on the output canvas |
| `sample_correspondences_per_pair` | per pair, at most 12 point pairs | a drawn illustration, not the inlier set |

Both are in output-image pixel coordinates, the same space as `image.width` and
`image.height`, so the client draws them without applying any transform. The
sampled correspondences are named for what they are: they must never be counted
or reported as a measurement. The inlier count is `inliers_per_pair`.

Both fields are optional. A client that receives a response without them renders
the panorama without an overlay.

## Error codes

| Code | Status | Implemented |
| --- | --- | --- |
| `TOO_FEW_IMAGES` | 400 | yes |
| `TOO_MANY_IMAGES` | 400 | yes |
| `UNSUPPORTED_IMAGE_TYPE` | 400 | yes |
| `IMAGE_TOO_LARGE` | 413 | yes |
| `EMPTY_IMAGE` | 422 | yes |
| `INVALID_STITCH_SETTINGS` | 422 | yes |
| `PIPELINE_NOT_IMPLEMENTED` | 501 | yes, until the pipeline lands |
| `NO_DESCRIPTORS` | 422 | no, owed by task 01 |
| `INSUFFICIENT_INLIERS` | 422 | no, owed by task 02 |
| `DEGENERATE_HOMOGRAPHY` | 422 | no, owed by task 02 |
| `DISCONNECTED_IMAGES` | 422 | no, owed by task 02 |

The four unimplemented codes are declared here because the result UI maps each
one to remedy text, per section 7.1 of `docs/ui-spec.md`. A code that is added
to the pipeline without appearing in this table will fall through to generic
remedy text in the UI.

## Error envelope

```json
{
  "detail": {
    "code": "INSUFFICIENT_INLIERS",
    "message": "Images 1 and 2 do not have enough geometric agreement.",
    "context": {
      "inliers": 5,
      "required": 12
    }
  }
}
```

Expected status codes: `400` invalid request, `413` too large, `422` valid
request but unusable images/geometry, `501` scaffold, `500` unexpected error.
