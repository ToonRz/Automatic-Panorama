import type { Detector } from "../../types";

export interface WorkingStateProps {
  fileCount: number;
  detector: Detector;
  isColdStart: boolean;
}

/**
 * docs/ui-spec.md section 5: no per-stage timing, percentage, or elapsed
 * counter while a request is in flight. The seven-stage checklist lives in
 * the stage ribbon (`PipelineRibbon`), not here; this illustration carries
 * the only other motion cue, an indeterminate bar.
 */
export function WorkingState({ fileCount, detector, isColdStart }: WorkingStateProps) {
  return (
    <div className="placeholder working">
      <svg className="frames" width="300" height="130" viewBox="0 0 300 130" aria-hidden="true">
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
      <p>The server answers once, at the end. Real stage timings appear as soon as it does.</p>
      <div className="indet" role="progressbar" aria-label="Stitching" />
      {isColdStart && (
        <p className="cold-start-note">
          The server may be waking up. The first run can take up to a minute.
        </p>
      )}
    </div>
  );
}
