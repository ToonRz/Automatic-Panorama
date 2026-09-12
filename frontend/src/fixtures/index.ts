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
import insufficientInliersSnapshot from "./contract/error-insufficient-inliers.json";
import successSnapshot from "./contract/stitch-success.json";

/** A 1x1 transparent PNG. Stands in for a real panorama in fixtures/tests. */
const PLACEHOLDER_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

export const successWithOverlayFixture = successSnapshot as unknown as StitchResponse;

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
  detail: insufficientInliersSnapshot.detail as ApiErrorDetail,
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
