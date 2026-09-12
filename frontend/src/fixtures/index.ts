/**
 * The one place mock-mode responses and fixture-driven tests are defined.
 * Everything here is typed against `frontend/src/types.ts` so a contract
 * change breaks the build instead of the demo (docs/ui-spec.md section 10).
 *
 * Shapes follow docs/backend-spec.md (sections 7-9), the live contract as of
 * this slice: `seam_lines` (a tilted two-point boundary per pair, not a
 * single x), and error `context` carrying zero-based `pair`/`image` indices
 * with one-based `message` text.
 */
import type { ApiErrorDetail, StitchResponse } from "../types";

/** A 1x1 transparent PNG. Stands in for a real panorama in fixtures/tests. */
const PLACEHOLDER_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

export const successWithOverlayFixture: StitchResponse = {
  status: "complete",
  image: {
    data_url: PLACEHOLDER_PNG_DATA_URL,
    mime_type: "image/png",
    width: 3840,
    height: 1380,
  },
  diagnostics: {
    detector: "SIFT",
    image_count: 3,
    image_order: [0, 1, 2],
    reference_index: 1,
    input_long_edge_budget: 1600,
    source_dimensions: [
      [4032, 3024],
      [4032, 3024],
      [4032, 3024],
    ],
    processed_dimensions: [
      [1600, 1200],
      [1600, 1200],
      [1600, 1200],
    ],
    input_scale_factor: [0.3968, 0.3968, 0.3968],
    keypoints_per_image: [812, 765, 930],
    candidate_pair_count: 2,
    ratio_passed_matches_per_pair: [146, 128],
    inliers_per_pair: [101, 87],
    inlier_ratio_per_pair: [0.69, 0.68],
    reprojection_error_per_pair: [1.42, 1.88],
    output_width: 3840,
    output_height: 1380,
    stage_timings_ms: {
      decode: 31.2,
      features: 418.5,
      matching: 12.3,
      homography: 4.8,
      warp: 96.4,
      blend: 83.7,
      encode: 40.1,
    },
    seam_lines: [
      { top: [1104.0, 0.0], bottom: [1118.0, 1380.0] },
      { top: [2216.0, 0.0], bottom: [2201.0, 1380.0] },
    ],
    sample_correspondences_per_pair: [
      [
        { from: [1042.0, 470.0], to: [1164.0, 508.0] },
        { from: [1000.0, 896.0], to: [1206.0, 862.0] },
      ],
      [
        { from: [2144.0, 486.0], to: [2272.0, 528.0] },
        { from: [2108.0, 908.0], to: [2310.0, 880.0] },
      ],
    ],
  },
};

export const successWithoutOverlayFixture: StitchResponse = {
  status: "complete",
  image: {
    data_url: PLACEHOLDER_PNG_DATA_URL,
    mime_type: "image/png",
    width: 1800,
    height: 640,
  },
  diagnostics: {
    detector: "ORB",
    image_count: 2,
    image_order: [0, 1],
    reference_index: 0,
    keypoints_per_image: [900, 880],
    candidate_pair_count: 1,
    ratio_passed_matches_per_pair: [200],
    inliers_per_pair: [150],
    inlier_ratio_per_pair: [0.75],
    reprojection_error_per_pair: [1.1],
    output_width: 1800,
    output_height: 640,
    stage_timings_ms: {
      decode: 18.0,
      features: 62.1,
      matching: 6.4,
      homography: 2.2,
      warp: 41.0,
      blend: 37.9,
      postprocess: 15.4,
    },
    // Overlay fields intentionally absent: this fixture proves the toggle
    // and overlay are omitted rather than shown disabled.
  },
};

export interface MockErrorFixture {
  status: number;
  detail: ApiErrorDetail;
}

export const insufficientInliersError: MockErrorFixture = {
  status: 422,
  detail: {
    code: "INSUFFICIENT_INLIERS",
    message: "Images 2 and 3 do not have enough geometric agreement.",
    context: {
      pair: [1, 2],
      pair_index: 1,
      inliers: 5,
      required: 12,
      inlier_ratio: 0.26,
    },
  },
};

export const imageTooLargeError: MockErrorFixture = {
  status: 413,
  detail: {
    code: "IMAGE_TOO_LARGE",
    message: "File 4 exceeds the 12 MB limit.",
    context: {
      image: 3,
      size_mb: 18.4,
      limit_mb: 12,
    },
  },
};

export const unrecognizedCodeError: MockErrorFixture = {
  status: 422,
  detail: {
    code: "EXOTIC_FAILURE_MODE",
    message: "The pipeline returned an error the frontend does not recognise.",
  },
};

export type MockScenario =
  | "success-with-overlay"
  | "success-without-overlay"
  | "insufficient-inliers"
  | "image-too-large"
  | "unrecognized-code";

export const MOCK_SCENARIOS: readonly MockScenario[] = [
  "success-with-overlay",
  "success-without-overlay",
  "insufficient-inliers",
  "image-too-large",
  "unrecognized-code",
];
