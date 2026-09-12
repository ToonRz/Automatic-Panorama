import type { ScreenState } from "../../hooks/useStitchRun";
import type { ApiErrorDetail, StitchResponse } from "../../types";
import { EmptyState } from "./EmptyState";
import { FailedState } from "./FailedState";
import { ScaffoldState } from "./ScaffoldState";
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
  scaffold: { label: "Scaffolded", className: "tag busy" },
};

const TITLE_BY_STATE: Partial<Record<ScreenState, string>> = {
  working: "Stitching",
  failed: "Not stitched",
  scaffold: "Not stitched",
};

/**
 * docs/ui-spec.md section 4: dispatches on the single state machine value.
 * The complete state is a placeholder here; 04c fills it in with the
 * result plate, overlay, and download, and 04d adds the diagnostics band.
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
      {state === "scaffold" && <ScaffoldState />}
      {state === "complete" && result && (
        <div className="plate">
          <img src={result.image.data_url} alt="Stitched panorama" />
        </div>
      )}
    </section>
  );
}
