import type { StitchDiagnostics } from "../../types";
import { argMax, argMin, sum } from "../../utils/stitchStats";

export interface SummaryCardsProps {
  diagnostics: StitchDiagnostics | null;
  mimeType?: string;
}

interface Kpi {
  label: string;
  qualifier?: string;
  value: string;
  secondary: string;
}

const EMPTY_KPIS: readonly Kpi[] = [
  { label: "Keypoints", value: "—", secondary: "—" },
  { label: "Ratio-passed", value: "—", secondary: "—" },
  { label: "Inliers", value: "—", secondary: "—" },
  { label: "Inlier ratio", qualifier: "lowest pair", value: "—", secondary: "—" },
  { label: "Reprojection", qualifier: "worst pair", value: "—", secondary: "—" },
  { label: "Output", value: "—", secondary: "—" },
];

function pairLabel(index: number, imageOrder: readonly number[]): string {
  return `pair ${imageOrder[index] + 1} → ${imageOrder[index + 1] + 1}`;
}

function kpisFrom(diagnostics: StitchDiagnostics, mimeType: string): Kpi[] {
  const totalKeypoints = sum(diagnostics.keypoints_per_image);
  const totalRatioPassed = sum(diagnostics.ratio_passed_matches_per_pair);
  const totalInliers = sum(diagnostics.inliers_per_pair);
  const worstRatioIndex = argMin(diagnostics.inlier_ratio_per_pair);
  const worstReprojectionIndex = argMax(diagnostics.reprojection_error_per_pair);
  const megapixels = (diagnostics.output_width * diagnostics.output_height) / 1_000_000;

  return [
    {
      label: "Keypoints",
      value: totalKeypoints.toLocaleString(),
      secondary: diagnostics.keypoints_per_image.join(" / "),
    },
    {
      label: "Ratio-passed",
      value: totalRatioPassed.toLocaleString(),
      secondary: `${diagnostics.ratio_passed_matches_per_pair.join(" + ")} matches`,
    },
    {
      label: "Inliers",
      value: totalInliers.toLocaleString(),
      secondary: `${diagnostics.inliers_per_pair.join(" + ")} correspondences`,
    },
    {
      label: "Inlier ratio",
      qualifier: "lowest pair",
      value: diagnostics.inlier_ratio_per_pair[worstRatioIndex].toFixed(2),
      secondary: pairLabel(worstRatioIndex, diagnostics.image_order),
    },
    {
      label: "Reprojection",
      qualifier: "worst pair",
      value: `${diagnostics.reprojection_error_per_pair[worstReprojectionIndex].toFixed(2)} px`,
      secondary: pairLabel(worstReprojectionIndex, diagnostics.image_order),
    },
    {
      label: "Output",
      value: `${diagnostics.output_width} × ${diagnostics.output_height}`,
      secondary: `${megapixels.toFixed(2)} MP · ${mimeType}`,
    },
  ];
}

/**
 * docs/ui-spec.md section 6.1 and 6.4: the KPI strip, six equal cells.
 * Labels and qualifiers always render; with no result the value and
 * secondary line are "—" rather than zero or a stale number (A15). The
 * inlier-ratio and reprojection cells name the one-based pair the worst
 * value came from, never an average (A4).
 */
export function SummaryCards({ diagnostics, mimeType = "" }: SummaryCardsProps) {
  const kpis = diagnostics ? kpisFrom(diagnostics, mimeType) : EMPTY_KPIS;

  return (
    <div className="panel kpis">
      {kpis.map((kpi) => (
        <div className="kpi" key={kpi.label}>
          <div className="k">
            {kpi.label}
            {kpi.qualifier && <em>{kpi.qualifier}</em>}
          </div>
          <span className="v mono">{kpi.value}</span>
          <span className="s mono">{kpi.secondary}</span>
        </div>
      ))}
    </div>
  );
}
