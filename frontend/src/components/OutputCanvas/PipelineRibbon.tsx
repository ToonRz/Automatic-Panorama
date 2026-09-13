import { PIPELINE_STAGES } from "../../constants/pipeline";

export type RibbonMode = "idle" | "pending" | "done";

export interface PipelineRibbonProps {
  mode: RibbonMode;
}

/**
 * docs/ui-spec.md section 3.1 and section 5: seven cells, one pending
 * treatment for every stage while working (no stage is ahead of another,
 * and no timing is ever shown here), turning --pass only in `complete`.
 */
export function PipelineRibbon({ mode }: PipelineRibbonProps) {
  return (
    <ol className="ribbon" data-mode={mode}>
      {PIPELINE_STAGES.map((stage, index) => (
        <li key={stage.key} title={stage.label}>
          <span className="n">
            <i aria-hidden="true" />
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="t">{stage.short}</span>
        </li>
      ))}
    </ol>
  );
}
