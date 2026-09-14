export type Detector = "SIFT" | "ORB";

export interface ClientConfig {
  max_upload_files: number;
  max_upload_mb: number;
  max_total_upload_mb: number;
  default_detector: Detector;
  ratio_threshold: number;
  ransac_reproj_threshold: number;
  min_inliers: number;
  min_inlier_ratio: number;
  max_input_long_edge_by_count: Record<string, number>;
}

export interface StitchOptions {
  detector: Detector;
  ratioThreshold: number;
  ransacReprojThreshold: number;
}

/**
 * One pair's status inside `context.partial_diagnostics` (docs/backend-spec.md
 * section 9.2). `"passed"` carries the same four measurements the success
 * response's per-pair arrays would; `"failed"` carries whatever that pair's
 * own rejection measured plus `failure`; `"not_processed"` carries only
 * `pair`/`pair_index`/`status` -- gate 7 is fail-fast, so a pair after the
 * one that failed is never run and must never be given a fabricated number.
 */
export interface PairDiagnostic {
  pair: [number, number];
  pair_index: number;
  status: "passed" | "failed" | "not_processed";
  ratio_passed_matches?: number;
  matches?: number;
  inlier_count?: number;
  inlier_ratio?: number;
  reprojection_error?: number;
  failure?: { code: string; message: string };
}

/** `DISCONNECTED_IMAGES`'s preserved gate 6/7 rejection (docs/backend-spec.md section 9.3). */
export interface ErrorCause {
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  /**
   * docs/backend-spec.md section 9: indices are zero-based, e.g. `pair: [1, 2]`.
   * Widened to `unknown` values (section 9.2/9.3): `partial_diagnostics` is an
   * array of objects and `cause` is a nested object, neither of which a flat
   * scalar map can represent. Every reader must guard its own shape rather
   * than assume a field is present or well-formed -- an old response, a
   * response with some fields missing, or a code the client has never seen
   * must still render without throwing.
   */
  context?: Record<string, unknown>;
}

export interface StitchCorrespondence {
  from: [number, number];
  to: [number, number];
}

/** docs/backend-spec.md section 8: a tilted two-point boundary, not a single x. */
export interface SeamLine {
  top: [number, number];
  bottom: [number, number];
}

export interface StitchDiagnostics {
  detector: Detector;
  image_count: number;
  image_order: number[];
  keypoints_per_image: number[];
  ratio_passed_matches_per_pair: number[];
  inliers_per_pair: number[];
  inlier_ratio_per_pair: number[];
  reprojection_error_per_pair: number[];
  output_width: number;
  output_height: number;
  stage_timings_ms: Record<string, number>;
  /** Overlay geometry (docs/ui-spec.md section 6.2). Optional: a response without it renders no overlay. */
  seam_lines?: SeamLine[];
  sample_correspondences_per_pair?: StitchCorrespondence[][];
  /**
   * Additional fields docs/backend-spec.md section 7 publishes that the
   * section 6.1 screen-element table does not currently read. Kept here so
   * the type matches the real response; not rendered by this UI slice.
   */
  reference_index?: number;
  input_long_edge_budget?: number;
  source_dimensions?: [number, number][];
  processed_dimensions?: [number, number][];
  input_scale_factor?: number[];
  candidate_pair_count?: number;
}

export interface StitchResponse {
  status: "complete";
  image: {
    data_url: string;
    mime_type: string;
    width: number;
    height: number;
  };
  diagnostics: StitchDiagnostics;
}
