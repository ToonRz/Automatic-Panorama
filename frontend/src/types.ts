export type Detector = "SIFT" | "ORB";

export interface StitchOptions {
  detector: Detector;
  ratioThreshold: number;
  ransacReprojThreshold: number;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  context?: Record<string, string | number>;
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
