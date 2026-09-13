import { useEffect, useState } from "react";
import { PIPELINE_STAGES } from "../../constants/pipeline";

export type RibbonMode = "idle" | "pending" | "done";

export interface PipelineRibbonProps {
  mode: RibbonMode;
  activeStageIndex?: number;
}

/**
 * Concept B: Cyber-Conduit Node Flow
 * Seven pipeline stages connected with laser conduits.
 * Displays completed stages with checkmarks, active stage with glowing pulse,
 * and pending laser flow animation.
 */
export function PipelineRibbon({ mode, activeStageIndex }: PipelineRibbonProps) {
  const [internalStage, setInternalStage] = useState(0);

  useEffect(() => {
    if (mode !== "pending") {
      setInternalStage(0);
      return;
    }
    const timer = setInterval(() => {
      setInternalStage((prev) => (prev < PIPELINE_STAGES.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(timer);
  }, [mode]);

  const currentStage = activeStageIndex ?? internalStage;

  return (
    <ol className="ribbon conduit-ribbon" data-mode={mode}>
      {PIPELINE_STAGES.map((stage, index) => {
        const isDone = mode === "done" || (mode === "pending" && index < currentStage);
        const isActive = mode === "pending" && index === currentStage;
        const isQueued = mode === "idle" || (mode === "pending" && index > currentStage);

        return (
          <li
            key={stage.key}
            title={stage.label}
            className={`conduit-step ${isDone ? "is-done" : ""} ${isActive ? "is-active" : ""} ${
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
                className={`conduit-line ${isDone ? "line-done" : ""} ${
                  isActive ? "line-active" : ""
                }`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
