import { PIPELINE_STAGES } from "../../constants/pipeline";

export interface WorkingStateProps {
  isColdStart: boolean;
}

/**
 * docs/ui-spec.md section 5: no per-stage timing, percentage, or elapsed
 * counter while a request is in flight. All six stages render in a single
 * pending treatment with one indeterminate motion cue, not a ticked list.
 */
export function WorkingState({ isColdStart }: WorkingStateProps) {
  return (
    <div className="progress">
      {PIPELINE_STAGES.map((stage) => (
        <div className="step" key={stage.key}>
          <span className="glyph" aria-hidden="true">
            ○
          </span>
          <span>{stage.label}</span>
        </div>
      ))}
      <div className="scanline" aria-hidden="true">
        <span />
      </div>
      {isColdStart && (
        <p className="cold-start-note">
          The free backend may be waking up — the first run after idle can take significantly
          longer than usual.
        </p>
      )}
    </div>
  );
}
