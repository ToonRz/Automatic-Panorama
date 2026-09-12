import type { StitchDiagnostics } from "../../types";

export interface PairTableProps {
  diagnostics: StitchDiagnostics;
}

/**
 * docs/ui-spec.md section 6.1: one row per pair, index i reads element i of
 * each per-pair array. The verdict column is derived, not sent — a pair is
 * "accepted" simply by appearing in a successful response.
 */
export function PairTable({ diagnostics }: PairTableProps) {
  const pairCount = diagnostics.image_order.length - 1;

  return (
    <div className="tablewrap">
      <table>
        <caption>Per-pair geometry</caption>
        <thead>
          <tr>
            <th>Pair</th>
            <th>Ratio-passed</th>
            <th>Inliers</th>
            <th>Inlier ratio</th>
            <th>Reproj. error</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: pairCount }, (_, i) => (
            <tr key={i}>
              <td>
                {diagnostics.image_order[i]} → {diagnostics.image_order[i + 1]}
              </td>
              <td className="num">{diagnostics.ratio_passed_matches_per_pair[i]}</td>
              <td className="num">{diagnostics.inliers_per_pair[i]}</td>
              <td className="num">{diagnostics.inlier_ratio_per_pair[i].toFixed(2)}</td>
              <td className="num">{diagnostics.reprojection_error_per_pair[i].toFixed(2)} px</td>
              <td className="pass">accepted</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
