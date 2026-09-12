# CV pipeline notes

This file explains *why* each stage does what it does, and how its thresholds
were chosen. It is not the contract.

The contract, the field definitions, the error catalogue, the settings, and the
numeric acceptance thresholds are in **`docs/backend-spec.md`**. Where the two
disagree, the specification wins. Numbers appearing below are illustrative
starting points for tuning, not the values the tests assert.

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

0.75 is Lowe's own suggestion and a reasonable place to start tuning against
the fixtures. Raising it admits more matches and more false ones, which is the
right trade on a low-texture scene and the wrong one on repeated texture. The
threshold is configuration and is exposed to the user, not a hidden constant.

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

Acceptance considers four things together, because each one alone can be
fooled. A high inlier count means little on a pair with thousands of matches; a
good ratio means little on a pair with six. The thresholds and the exact
rejection codes are in `docs/backend-spec.md` sections 9 and 10.

- at least four non-collinear correspondences;
- a minimum inlier count;
- a minimum inlier ratio, which catches a lucky fit among many bad matches;
- a finite, non-degenerate `H` whose projected quadrilateral stays convex;
- a reprojection error below the configured ceiling.

Keep the inlier mask for the UI/demo so the team can show why an alignment was
accepted or rejected.

## 5. Multi-image ordering and transform composition

The strategy is deterministic and explainable on purpose, because the demo has
to justify it out loud in under a minute.

v1 chains the frames in upload order and takes the middle frame as the
reference. Upload order is capture order, and composing outward from the middle
halves the worst accumulated distortion compared with anchoring on the first
frame. The interface states that order matters rather than hiding it behind a
reorder control that would not change the chain.

Automatic ordering from the pairwise overlap scores is a later change. It was
designed so the response shape does not move when it lands: `image_order` is
already published and is simply identity today. See `docs/backend-spec.md`
section 7.2.

## 6. Warping

- Transform image corners into reference coordinates.
- Compute the union bounding rectangle across all projected corners.
- Translate the canvas so coordinates are non-negative.
- Call `cv2.warpPerspective` for every image and its validity mask.
- Guard output width, height, and total pixels to avoid free-tier memory
  spikes. An oversized canvas is rejected, never scaled down to fit: after the
  per-request input budget, an overflow means the geometry is wrong, and
  shrinking it would deliver a distorted result that looks normal.

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
- encode PNG for lossless grading evidence. JPEG is not offered; one format
  that is right beats a half-built second one;
- return dimensions and diagnostics.

## Diagnostics

Every stage below is measured on the success path, not only on failure. The
exact field names, shapes, and formulas are in `docs/backend-spec.md` section
7. Two of them are easy to compute two different ways, so they are pinned
there rather than here: the inlier ratio's denominator is the ratio-passed
match count, and the reprojection error is the median symmetric transfer error
over inliers only.

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

Each seam has unit tests against fixtures generated in code from a known
homography, so a test asserts distance from ground truth rather than absence of
a crash. `docs/backend-spec.md` section 12 has the fixture set and the numbers
a slice must hit to merge.
