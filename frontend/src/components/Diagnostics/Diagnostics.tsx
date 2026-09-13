import type { StitchResponse } from "../../types";
import { PairTable } from "./PairTable";
import { StageChart } from "./StageChart";
import { SummaryCards } from "./SummaryCards";

export interface DiagnosticsProps {
  result: StitchResponse | null;
  files?: readonly { name: string }[];
}

/**
 * docs/ui-spec.md section 6.4: the diagnostics band is part of the page
 * composition in every state, not only `complete`, so the page never
 * collapses to a short column before the first run. Outside `complete` it
 * renders its frame with no measurement in it — no number, zero, or
 * previous-run value.
 */
export function Diagnostics({ result, files = [] }: DiagnosticsProps) {
  const diagnostics = result?.diagnostics ?? null;

  return (
    <section className="diag" aria-label="Diagnostics">
      <div className="diag-head">
        <h2>Alignment diagnostics</h2>
        <p>
          {result
            ? "Read from the server response. Ratio and error show the worst pair, not an average."
            : "Filled in after a successful run."}
        </p>
      </div>

      <SummaryCards diagnostics={diagnostics} mimeType={result?.image.mime_type} />

      <div className="diag-row">
        <PairTable diagnostics={diagnostics} files={files} />
        <StageChart stageTimingsMs={diagnostics?.stage_timings_ms ?? null} />
      </div>
    </section>
  );
}
