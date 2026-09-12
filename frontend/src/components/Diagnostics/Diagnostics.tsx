import type { StitchResponse } from "../../types";
import { PairTable } from "./PairTable";
import { StageChart } from "./StageChart";
import { SummaryCards } from "./SummaryCards";

export interface DiagnosticsProps {
  result: StitchResponse;
}

/**
 * docs/ui-spec.md section 6.1: the full-width evidence band — summary
 * cards, the per-pair table, and the stage timing chart.
 */
export function Diagnostics({ result }: DiagnosticsProps) {
  const { diagnostics, image } = result;

  return (
    <section className="diagnostics">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="kicker">Evidence</span>
          <h2>Run diagnostics</h2>
        </div>
        <span className="counter">
          {diagnostics.detector} · {diagnostics.image_count} frames · order{" "}
          {diagnostics.image_order.join(" → ")}
        </span>
      </div>

      <SummaryCards diagnostics={diagnostics} mimeType={image.mime_type} />
      <PairTable diagnostics={diagnostics} />
      <StageChart stageTimingsMs={diagnostics.stage_timings_ms} />
    </section>
  );
}
