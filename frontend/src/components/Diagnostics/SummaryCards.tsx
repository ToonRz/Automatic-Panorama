import type { StitchDiagnostics } from "../../types";
import { max, min, sum } from "../../utils/stitchStats";

export interface SummaryCardsProps {
  diagnostics: StitchDiagnostics;
  mimeType: string;
}

/**
 * docs/ui-spec.md section 6.1. Every value here traces to a named field;
 * the only arithmetic is the sums and the megapixel figure the table
 * explicitly allows. The inlier-ratio and reprojection cards show the
 * worst pair (min/max), never an average (A4).
 */
export function SummaryCards({ diagnostics, mimeType }: SummaryCardsProps) {
  const totalKeypoints = sum(diagnostics.keypoints_per_image);
  const totalRatioPassed = sum(diagnostics.ratio_passed_matches_per_pair);
  const totalInliers = sum(diagnostics.inliers_per_pair);
  const worstInlierRatio = min(diagnostics.inlier_ratio_per_pair);
  const worstReprojection = max(diagnostics.reprojection_error_per_pair);
  const megapixels = (diagnostics.output_width * diagnostics.output_height) / 1_000_000;

  return (
    <div className="diag-grid">
      <div>
        <span>Keypoints</span>
        <strong className="mono">{totalKeypoints.toLocaleString()}</strong>
        <em>{diagnostics.keypoints_per_image.join(" / ")}</em>
      </div>
      <div>
        <span>Ratio-passed</span>
        <strong className="mono">{totalRatioPassed.toLocaleString()}</strong>
        <em>{diagnostics.ratio_passed_matches_per_pair.join(" + ")} matches</em>
      </div>
      <div>
        <span>Inliers</span>
        <strong className="mono">{totalInliers.toLocaleString()}</strong>
        <em>{diagnostics.inliers_per_pair.join(" + ")} correspondences</em>
      </div>
      <div>
        <span>Inlier ratio</span>
        <strong className="mono">{worstInlierRatio.toFixed(2)}</strong>
        <em>lowest pair</em>
      </div>
      <div>
        <span>Reprojection</span>
        <strong className="mono">{worstReprojection.toFixed(2)} px</strong>
        <em>worst pair</em>
      </div>
      <div>
        <span>Output</span>
        <strong className="mono">
          {diagnostics.output_width} × {diagnostics.output_height}
        </strong>
        <em>
          {megapixels.toFixed(2)} MP · {mimeType}
        </em>
      </div>
    </div>
  );
}
