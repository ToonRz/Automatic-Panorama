import type { StitchResponse } from "../../types";
import { PairTable } from "./PairTable";
import { StageChart } from "./StageChart";
import { SummaryCards } from "./SummaryCards";

export interface DiagnosticsProps {
  result: StitchResponse;
  files?: readonly { name: string }[];
}

/**
 * docs/ui-spec.md section 6.1: the full-width evidence band — summary
 * cards, the per-pair table, and the stage timing chart. `image_order` is
 * zero-based over the upload selection (docs/backend-spec.md section 9); the
 * interface counts frames the way a person does (docs/integration-spec.md
 * section 7.1).
 */
export function Diagnostics({ result, files = [] }: DiagnosticsProps) {
  const { diagnostics, image } = result;

  return (
    <section className="diagnostics">
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="kicker">Details</span>
          <h2>Run diagnostics</h2>
        </div>
        <span className="counter">
          {diagnostics.detector} · {diagnostics.image_count} frames · order{" "}
          {diagnostics.image_order.map((index) => index + 1).join(" → ")}
        </span>
      </div>

      <SummaryCards diagnostics={diagnostics} mimeType={image.mime_type} />
      <PairTable diagnostics={diagnostics} files={files} />
      <StageChart stageTimingsMs={diagnostics.stage_timings_ms} />
    </section>
  );
}
