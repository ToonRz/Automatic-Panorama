import type { StitchDiagnostics } from "../../types";

export interface PairTableProps {
  diagnostics: StitchDiagnostics;
  files?: readonly { name: string }[];
}

/**
 * docs/ui-spec.md section 6.1: one row per pair, index i reads element i of
 * each per-pair array. The verdict column is derived, not sent — a pair is
 * "accepted" simply by appearing in a successful response. The pair cell
 * shows one-based frame numbers, with the file names in its `title`
 * (docs/integration-spec.md section 7.1).
 */
export function PairTable({ diagnostics, files = [] }: PairTableProps) {
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
          {Array.from({ length: pairCount }, (_, i) => {
            const first = diagnostics.image_order[i];
            const second = diagnostics.image_order[i + 1];
            const firstName = files[first]?.name ?? `frame ${first + 1}`;
            const secondName = files[second]?.name ?? `frame ${second + 1}`;
            return (
              <tr key={i}>
                <td title={`${firstName} → ${secondName}`}>
                  {first + 1} → {second + 1}
                </td>
                <td className="num">{diagnostics.ratio_passed_matches_per_pair[i]}</td>
                <td className="num">{diagnostics.inliers_per_pair[i]}</td>
                <td className="num">{diagnostics.inlier_ratio_per_pair[i].toFixed(2)}</td>
                <td className="num">{diagnostics.reprojection_error_per_pair[i].toFixed(2)} px</td>
                <td className="pass">accepted</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
