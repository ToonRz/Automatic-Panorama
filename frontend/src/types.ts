export type Detector = "SIFT" | "ORB";

export interface StitchOptions {
  detector: Detector;
  ratioThreshold: number;
  ransacReprojThreshold: number;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  /** docs/backend-spec.md section 9: indices are zero-based, e.g. `pair: [1, 2]`. */
  context?: Record<string, string | number | number[]>;
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
