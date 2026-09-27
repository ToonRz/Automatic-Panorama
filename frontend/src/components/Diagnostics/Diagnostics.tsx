import type { ApiErrorDetail, StitchResponse } from "../../types";
import { getPartialDiagnostics } from "../../utils/partialDiagnostics";
import { FeatureSurvivalFunnel } from "./FeatureSurvivalFunnel";
import { PairTable } from "./PairTable";
import { PartialPairTable } from "./PartialPairTable";
import { StageChart } from "./StageChart";
import { SummaryCards } from "./SummaryCards";

export interface DiagnosticsProps {
  result: StitchResponse | null;
  /** The current run's failure, if any (docs/backend-spec.md section 9.2's `partial_diagnostics`). */
  error?: { status: number; detail: ApiErrorDetail } | null;
  files?: readonly { name: string }[];
  /** Lowe ratio threshold of the run, for the funnel's ratio-test labels (G3). */
  ratioThreshold?: number;
}

/**
 * docs/ui-spec.md section 6.4: the diagnostics band is part of the page
 * composition in every state, not only `complete`, so the page never
 * collapses to a short column before the first run. Outside `complete`,
 * with no partial evidence to show, it renders its frame with no
 * measurement in it — no number, zero, or previous-run value. A failed run
 * that reached gate 6 or 7 carries `partial_diagnostics` (docs/backend-spec.md
 * section 9.2): that per-pair evidence renders here instead, since it is
 * real, measured data, not the previous run's stale result — `result` is
 * always `null` on a failed run, so there is nothing left over to bleed
 * through.
 */
export function Diagnostics({ result, error = null, files = [], ratioThreshold }: DiagnosticsProps) {
  const diagnostics = result?.diagnostics ?? null;
  const partialPairs = result ? null : getPartialDiagnostics(error?.detail);

  return (
    <section className="diag" aria-label="Diagnostics">
      <div className="diag-head">
        <h2>Alignment diagnostics</h2>
        <p>
          {result
            ? "Read from the server response. Ratio and error show the worst pair, not an average."
            : partialPairs
              ? "The run stopped before finishing. Pairs measured before that are shown below."
              : "Filled in after a successful run."}
        </p>
      </div>

      <SummaryCards diagnostics={diagnostics} mimeType={result?.image.mime_type} />

      <FeatureSurvivalFunnel diagnostics={diagnostics} files={files} ratioThreshold={ratioThreshold} />

      <div className="diag-row">
        {partialPairs ? (
          <PartialPairTable pairs={partialPairs} files={files} />
        ) : (
          <PairTable diagnostics={diagnostics} files={files} />
        )}
        <StageChart stageTimingsMs={diagnostics?.stage_timings_ms ?? null} />
      </div>
    </section>
  );
}
