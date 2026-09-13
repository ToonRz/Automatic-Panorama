import type { StitchDiagnostics } from "../../types";

export interface PairTableProps {
  diagnostics: StitchDiagnostics | null;
  files?: readonly { name: string }[];
}

/**
 * docs/ui-spec.md section 6.1/6.4: one row per pair, index i reads element i
 * of each per-pair array. The verdict column is derived, not sent — a pair
 * is "accepted" simply by appearing in a successful response. With no
 * result the table keeps its header and shows one placeholder row.
 */
export function PairTable({ diagnostics, files = [] }: PairTableProps) {
  const pairCount = diagnostics ? diagnostics.image_order.length - 1 : 0;

  return (
    <div className="panel pairtable">
      <div className="panel-head">
        <h2>Per-pair geometry</h2>
        {diagnostics && <span className="aside">{pairCount} pairs · all accepted</span>}
      </div>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Pair</th>
              <th className="r">Ratio-passed</th>
              <th className="r">Inliers</th>
              <th className="r">Inlier ratio</th>
              <th className="r">Reproj. error</th>
              <th>Verdict</th>
            </tr>
          </thead>
          <tbody>
            {diagnostics ? (
              Array.from({ length: pairCount }, (_, i) => {
                const first = diagnostics.image_order[i];
                const second = diagnostics.image_order[i + 1];
                const firstName = files[first]?.name ?? `frame ${first + 1}`;
                const secondName = files[second]?.name ?? `frame ${second + 1}`;
                const ratio = diagnostics.inlier_ratio_per_pair[i];
                return (
                  <tr key={i}>
                    <td>
                      <span className="pair" title={`${firstName} → ${secondName}`}>
                        <b>{first + 1}</b> → <b>{second + 1}</b>
                      </span>
                    </td>
                    <td className="r num">{diagnostics.ratio_passed_matches_per_pair[i]}</td>
                    <td className="r num">{diagnostics.inliers_per_pair[i]}</td>
                    <td className="r">
                      <span className="ratio">
                        <span className="bar">
                          <i style={{ width: `${ratio * 100}%` }} />
                        </span>
                        <span className="num">{ratio.toFixed(2)}</span>
                      </span>
                    </td>
                    <td className="r num">
                      {diagnostics.reprojection_error_per_pair[i].toFixed(2)} px
                    </td>
                    <td>
                      <span className="pill">
                        <i aria-hidden="true" />
                        accepted
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="emptyrow">
                <td colSpan={6}>No accepted pairs yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
