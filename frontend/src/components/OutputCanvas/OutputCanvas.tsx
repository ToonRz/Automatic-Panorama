import { useState } from "react";

import { PanelHead } from "../PanelHead";
import type { ScreenState } from "../../hooks/useStitchRun";
import { FALLBACK_CONFIG } from "../../constants/config";
import type { ApiErrorDetail, ClientConfig, Detector, StitchResponse } from "../../types";
import { EmptyState } from "./EmptyState";
import { FailedState } from "./FailedState";
import { PipelineRibbon, type RibbonMode } from "./PipelineRibbon";
import { ResultPlate } from "./ResultPlate";
import { WorkingState } from "./WorkingState";

export interface OutputCanvasProps {
  state: ScreenState;
  isColdStart: boolean;
  error: { status: number; detail: ApiErrorDetail } | null;
  result: StitchResponse | null;
  isStale: boolean;
  config?: ClientConfig;
  files?: readonly { name: string }[];
  detector: Detector;
  ratioThreshold: number;
  ransacThreshold: number;
}

const TITLE_BY_STATE: Partial<Record<ScreenState, string>> = {
  working: "Stitching",
  failed: "Not stitched",
};

const RIBBON_MODE_BY_STATE: Record<ScreenState, RibbonMode> = {
  empty: "idle",
  preparing: "idle",
  ready: "idle",
  working: "pending",
  complete: "done",
  failed: "idle",
};

function downloadFilename(detector: string, width: number, height: number): string {
  return `panorama-${detector}-${width}x${height}.png`.toLowerCase();
}

/**
 * docs/ui-spec.md section 4: dispatches on the single state machine value.
 * The overlay toggle's on/off state and the download handler live here
 * (moved up from `ResultPlate`) because section 3.1 puts both in the stage
 * head's tools, not the viewport.
 */
export function OutputCanvas({
  state,
  isColdStart,
  error,
  result,
  isStale,
  config = FALLBACK_CONFIG,
  files = [],
  detector,
  ratioThreshold,
  ransacThreshold,
}: OutputCanvasProps) {
  const [overlayOn, setOverlayOn] = useState(true);
  const hasOverlay = Boolean(
    result?.diagnostics.seam_lines && result?.diagnostics.sample_correspondences_per_pair,
  );

  function handleDownload() {
    if (!result) return;
    const { image, diagnostics } = result;
    const link = document.createElement("a");
    link.href = image.data_url;
    link.download = downloadFilename(diagnostics.detector, image.width, image.height);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <section className="panel stage" aria-label="Output" aria-live="polite">
      <PanelHead index={3} title={TITLE_BY_STATE[state] ?? "Panorama"}>
        <div className="chips">
          {state === "empty" && <span className="chip">Waiting for frames</span>}
          {state === "preparing" && (
            <span className="chip run">
              <i aria-hidden="true" />
              Preparing
            </span>
          )}
          {state === "ready" && <span className="chip">Ready · {files.length} frames</span>}
          {state === "working" && (
            <span className="chip run">
              <i aria-hidden="true" />
              Running
            </span>
          )}
          {state === "complete" && result && (
            <>
              <span className="chip pass">
                <i aria-hidden="true" />
                Complete
              </span>
              <span className="chip">{result.diagnostics.detector}</span>
              <span className="chip">{result.diagnostics.image_count} frames</span>
              <span className="chip">
                order {result.diagnostics.image_order.map((index) => index + 1).join(" → ")}
              </span>
              {isStale && (
                <span className="chip run">
                  <i aria-hidden="true" />
                  Produced with previous settings
                </span>
              )}
            </>
          )}
          {state === "failed" && (
            <span className="chip fail">
              <i aria-hidden="true" />
              Rejected
            </span>
          )}
        </div>

        {state === "complete" && result && (
          <div className="tools">
            {hasOverlay && (
              <button
                className="tool"
                type="button"
                aria-pressed={overlayOn}
                onClick={() => setOverlayOn((value) => !value)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M12 3v18" strokeDasharray="3 3" />
                  <circle cx="6" cy="8" r="2" />
                  <circle cx="18" cy="15" r="2" />
                </svg>
                Seams &amp; inliers
              </button>
            )}
            <button
              className="tool primary"
              type="button"
              onClick={handleDownload}
              aria-label={`Download PNG ${result.image.width}×${result.image.height}`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16" />
              </svg>
              <span className="dl-word" aria-hidden="true">
                Download
              </span>{" "}
              <span aria-hidden="true">PNG</span>{" "}
              <span className="mono" aria-hidden="true">
                {result.image.width}×{result.image.height}
              </span>
            </button>
          </div>
        )}
      </PanelHead>

      <div className="viewport">
        {(state === "empty" || state === "preparing" || state === "ready") && (
          <EmptyState
            state={state}
            fileCount={files.length}
            detector={detector}
            ratioThreshold={ratioThreshold}
            ransacThreshold={ransacThreshold}
          />
        )}
        {state === "preparing" && <span className="sr-only">Preparing images…</span>}
        {state === "working" && (
          <WorkingState fileCount={files.length} detector={detector} isColdStart={isColdStart} />
        )}
        {state === "failed" && error && (
          <FailedState status={error.status} detail={error.detail} config={config} files={files} />
        )}
        {state === "complete" && result && <ResultPlate result={result} overlayOn={overlayOn} />}
      </div>

      <PipelineRibbon mode={RIBBON_MODE_BY_STATE[state]} />
    </section>
  );
}
