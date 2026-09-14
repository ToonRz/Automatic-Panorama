import type { PairDiagnostic } from "../../types";

export interface PartialPairTableProps {
  pairs: readonly PairDiagnostic[];
  files?: readonly { name: string }[];
}

const STATUS_LABEL: Record<PairDiagnostic["status"], string> = {
  passed: "accepted",
  failed: "rejected",
  not_processed: "not processed",
};

const STATUS_PILL_CLASS: Record<PairDiagnostic["status"], string> = {
  passed: "pass",
  failed: "fail",
  not_processed: "pending",
};

function formatRatio(value: number | undefined): string {
  return value === undefined ? "—" : `${Math.round(value * 100)}%`;
}

function formatCount(value: number | undefined): string {
  return value === undefined ? "—" : String(value);
}

function formatPx(value: number | undefined): string {
  return value === undefined ? "—" : `${value.toFixed(2)} px`;
}

/**
 * docs/ui-spec.md section 6.4 / backend-spec.md section 9.2: renders a
 * failed run's `partial_diagnostics` instead of the "no accepted pairs yet"
 * placeholder, one row per pair the request would have needed. A pair that
 * was never reached (fail-fast, spec section 3) shows `—` in every
 * measurement column rather than a fabricated 0 -- "not processed" is a
 * distinct status from "measured and failed".
 */
export function PartialPairTable({ pairs, files = [] }: PartialPairTableProps) {
  return (
    <div className="panel pairtable">
      <div className="panel-head">
        <h2>Per-pair geometry</h2>
        <span className="aside">{pairs.length} pairs · run stopped early</span>
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
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((row) => {
              const [first, second] = row.pair;
              const firstName = files[first]?.name ?? `frame ${first + 1}`;
              const secondName = files[second]?.name ?? `frame ${second + 1}`;
              return (
                <tr key={row.pair_index} className={row.status}>
                  <td>
                    <span className="pair" title={`${firstName} → ${secondName}`}>
                      <b>{first + 1}</b> → <b>{second + 1}</b>
                    </span>
                  </td>
                  <td className="r num">
                    {formatCount(row.ratio_passed_matches ?? row.matches)}
                  </td>
                  <td className="r num">{formatCount(row.inlier_count)}</td>
                  <td className="r num">{formatRatio(row.inlier_ratio)}</td>
                  <td className="r num">{formatPx(row.reprojection_error)}</td>
                  <td>
                    <span className={`pill ${STATUS_PILL_CLASS[row.status]}`}>
                      <i aria-hidden="true" />
                      {STATUS_LABEL[row.status]}
                    </span>
                    {row.status === "failed" && row.failure && (
                      <div className="pair-failure">{row.failure.message}</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
