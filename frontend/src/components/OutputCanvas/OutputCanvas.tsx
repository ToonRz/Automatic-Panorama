import type { ScreenState } from "../../hooks/useStitchRun";
import type { ApiErrorDetail, StitchResponse } from "../../types";
import { EmptyState } from "./EmptyState";
import { FailedState } from "./FailedState";
import { ResultPlate } from "./ResultPlate";
import { WorkingState } from "./WorkingState";

export interface OutputCanvasProps {
  state: ScreenState;
  isColdStart: boolean;
  error: { status: number; detail: ApiErrorDetail } | null;
  result: StitchResponse | null;
  isStale: boolean;
}

const TAG_BY_STATE: Partial<Record<ScreenState, { label: string; className: string }>> = {
  complete: { label: "Complete", className: "tag ok" },
  working: { label: "Running", className: "tag busy" },
  failed: { label: "Rejected", className: "tag bad" },
};

const TITLE_BY_STATE: Partial<Record<ScreenState, string>> = {
  working: "Stitching",
  failed: "Not stitched",
};

/**
 * docs/ui-spec.md section 4: dispatches on the single state machine value.
 */
export function OutputCanvas({ state, isColdStart, error, result, isStale }: OutputCanvasProps) {
  const tag = TAG_BY_STATE[state];

  return (
    <section className="panel canvas-panel" aria-live="polite">
      <div className="panel-head">
        <div>
          <span className="kicker">Output</span>
          <h2>{TITLE_BY_STATE[state] ?? "Panorama"}</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isStale && <span className="stale-note">Produced with previous settings</span>}
          {tag && <span className={tag.className}>{tag.label}</span>}
        </div>
      </div>

      {(state === "empty" || state === "ready") && <EmptyState />}
      {state === "working" && <WorkingState isColdStart={isColdStart} />}
      {state === "failed" && error && <FailedState status={error.status} detail={error.detail} />}
      {state === "complete" && result && <ResultPlate result={result} />}
    </section>
  );
}
