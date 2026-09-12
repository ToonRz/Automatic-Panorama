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
