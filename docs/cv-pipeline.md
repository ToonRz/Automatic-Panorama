# CV pipeline design

This is the implementation contract for the Automatic Panorama Stitcher. The
code stubs under `backend/app/cv/` deliberately mirror these stages.

## 1. Decode and normalize

- Accept common raster formats supported by the browser and Pillow/OpenCV.
- Decode bytes in memory; reject malformed files.
- Convert to a consistent OpenCV BGR/gray representation.
- Preserve the original image index and dimensions for diagnostics.
- Enforce maximum file bytes and decoded pixel count before expensive work.

## 2. Feature extraction

Expose one interface with `detector = SIFT | ORB`.

### SIFT (default)

- Convert to grayscale.
- Use a documented `nfeatures` cap so the free backend remains responsive.
- Return keypoints, descriptors, and keypoint count.
- Use Euclidean/L2 descriptor distance.

### ORB (fallback/comparison)

- Use the same output interface.
- Use a documented `nfeatures` cap and pyramid settings.
- Use binary descriptors and Hamming distance.

The demo should explain that SIFT is more robust to scale/rotation while ORB is
faster and lighter, not imply that one wins for every image pair.

## 3. Matching and ratio test

For candidate image pairs:

1. Run KNN matching with `k=2`.
2. Keep a match only when `distance_1 < ratio_threshold * distance_2`.
3. Record raw pairs, ratio-passed matches, and the threshold.
4. Use L2 for SIFT and Hamming for ORB.

Start with `ratio_threshold = 0.75` and tune against the golden fixtures. The
threshold is configuration, not a hidden constant.

## 4. Homography and RANSAC

For a pair with enough ratio-passed matches:

```python
H, inlier_mask = cv2.findHomography(
    source_points,
    destination_points,
    method=cv2.RANSAC,
    ransacReprojThreshold=ransac_reproj_threshold,
)
```

Acceptance must consider all of:

- at least four non-collinear correspondences;
- configured minimum inlier count (initial target: 12);
- inlier ratio (initial target: >= 0.25, tune with fixtures);
- finite, non-degenerate `H` and a valid projected quadrilateral;
- median/mean reprojection error below a documented threshold.

Keep the inlier mask for the UI/demo so the team can show why an alignment was
accepted or rejected.

## 5. Multi-image ordering and transform composition

The first implementation should use a deterministic, explainable strategy:

- compute pairwise overlap scores for neighboring candidates;
- choose a reference image near the center of the sequence or the image with
  the strongest valid connections;
- compose transforms into the reference coordinate system;
- reject disconnected images with a per-image reason.

If the UI permits manual ordering, make that explicit. Automatic ordering is a
stretch goal after the sequential three-image path is reliable.

## 6. Warping

- Transform image corners into reference coordinates.
- Compute the union bounding rectangle across all projected corners.
- Translate the canvas so coordinates are non-negative.
- Call `cv2.warpPerspective` for every image and its validity mask.
- Guard output width, height, and total pixels to avoid free-tier memory spikes.

## 7. Seamless blending

Minimum viable strategy:

- create a valid-pixel mask for each warped image;
- normalize/clip masks and avoid black border pixels;
- feather alpha weights across overlaps;
- blend in float space and convert back to 8-bit.

Stretch strategy:

- estimate simple per-image exposure gain in overlap regions;
- use a multi-band/Laplacian pyramid blend for difficult seams.

The demo must state which strategy is implemented and show at least one seam
comparison. Do not claim “seamless” if the result simply pastes the last image.

## 8. Crop and encode

- find the largest meaningful connected content region or crop transparent/
  empty borders from the final mask;
- encode PNG for lossless grading evidence, with JPEG as an optional download;
- return dimensions and diagnostics.

## Diagnostics contract

The result should contain:

```text
detector
image_count
image_order
keypoints_per_image
candidate_pair_count
ratio_passed_matches_per_pair
inliers_per_pair
inlier_ratio_per_pair
reprojection_error_per_pair
output_width / output_height
stage_timings_ms
```

## Failure cases to test

- one image, blank image, corrupted image, and unsupported content type;
- two images with no overlap;
- repeated texture that creates many ambiguous matches;
- too few keypoints;
- a near-degenerate planar configuration;
- three images where the middle image is the only bridge;
- mixed resolutions and portrait/landscape orientation;
- an output that would exceed the configured canvas limit.

## Implementation seams

Do not let the API import OpenCV helper details. Use the stubs as the seams:

```text
features -> matching -> homography -> warping -> blending
                         \-> pipeline ordering/composition -> result
```

Each seam should eventually have unit tests with synthetic images or small
licensed fixtures. A full end-to-end test should assert both image dimensions
and geometric diagnostics, not only that an HTTP request returned `200`.
