import { PIPELINE_STAGES } from "../../constants/pipeline";
import type { Detector } from "../../types";

export interface WorkingStateProps {
  fileCount: number;
  detector: Detector;
  isColdStart: boolean;
  activeStageIndex?: number;
}

/**
 * Concept B: Centered Cyber HUD
 * Dynamic pipeline feedback indicating which OpenCV stage is currently in progress.
 */
export function WorkingState({
  fileCount,
  detector,
  isColdStart,
  activeStageIndex = 0,
}: WorkingStateProps) {
  const currentStage = PIPELINE_STAGES[activeStageIndex] ?? PIPELINE_STAGES[0];

  return (
    <div className="placeholder working cyber-working-hud">
      <svg className="frames" width="352" height="130" viewBox="-26 0 352 130" aria-hidden="true">
        <g className="f1">
          <rect x="10" y="20" width="120" height="90" rx="8" />
          <text x="20" y="40">01</text>
        </g>
        <g className="f3">
          <rect x="170" y="20" width="120" height="90" rx="8" />
          <text x="180" y="40">03</text>
        </g>
        <g className="f2">
          <rect x="90" y="20" width="120" height="90" rx="8" />
          <text x="100" y="40">02</text>
        </g>
      </svg>

      <h3>
        Stitching {fileCount} frames with {detector}…
      </h3>

      <div className="cyber-hud-card" aria-live="polite">
        <div className="hud-badge">
          <span className="hud-pulse-blip" aria-hidden="true" />
          <span>STAGE 0{activeStageIndex + 1} OF 07</span>
        </div>
        <div className="hud-stage-title">{currentStage.label}</div>
        <p className="hud-stage-desc">{currentStage.description}</p>

        <div className="hud-metrics">
          <span className="hud-metric">
            Frames: <b>{fileCount}</b>
          </span>
          <span className="hud-sep" aria-hidden="true">·</span>
          <span className="hud-metric">
            Detector: <b>{detector}</b>
          </span>
          <span className="hud-sep" aria-hidden="true">·</span>
          <span className="hud-metric status-active">
            Pipeline Active
          </span>
        </div>
      </div>

      <p className="hud-server-note">
        The server answers once, at the end. Real stage timings appear as soon as it does.
      </p>
      <div className="indet" role="progressbar" aria-label="Stitching" />
      {isColdStart && (
        <p className="cold-start-note">
          The server may be waking up. The first run can take up to a minute.
        </p>
      )}
    </div>
  );
}
