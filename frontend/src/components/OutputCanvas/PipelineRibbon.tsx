import { PIPELINE_STAGES } from "../../constants/pipeline";

export type RibbonMode = "idle" | "pending" | "done";

export interface PipelineRibbonProps {
  mode: RibbonMode;
}

/**
 * docs/ui-spec.md section 5: the server answers once, at the end, so in
 * pending mode every stage gets the same treatment. No stage is ticked or
 * ahead of another until the result arrives.
 */
export function PipelineRibbon({ mode }: PipelineRibbonProps) {
  return (
    <ol className="ribbon conduit-ribbon" data-mode={mode}>
      {PIPELINE_STAGES.map((stage, index) => {
        const isDone = mode === "done";
        const isPending = mode === "pending";
        const isQueued = mode === "idle";

        return (
          <li
            key={stage.key}
            title={stage.label}
            className={`conduit-step ${isDone ? "is-done" : ""} ${isPending ? "is-pending" : ""} ${
              isQueued ? "is-queued" : ""
            }`}
          >
            <div className="node-content">
              <span className="node-circle" aria-hidden="true">
                {isDone ? (
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
              </span>
              <span className="t">{stage.short}</span>
            </div>

            {index < PIPELINE_STAGES.length - 1 && (
              <div
                className={`conduit-line ${isDone ? "line-done" : ""}`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
