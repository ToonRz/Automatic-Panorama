import { useState } from "react";

import { ControlRail } from "./components/ControlRail/ControlRail";
import { Diagnostics } from "./components/Diagnostics/Diagnostics";
import { OutputCanvas } from "./components/OutputCanvas/OutputCanvas";
import { StatusPill } from "./components/StatusPill";
import { MIN_FILES } from "./constants/thresholds";
import type { DebugStateKey } from "./dev/debugStates";
import { StateSwitcher } from "./dev/StateSwitcher";
import { useBackendAvailability } from "./hooks/useBackendAvailability";
import { useClientConfig } from "./hooks/useClientConfig";
import { useStitchRun } from "./hooks/useStitchRun";

export default function App() {
  // Checked as a literal, inline, in this file so esbuild folds the
  // switcher out of a production build (docs/ui-spec.md section 10 / A12)
  // rather than relying on cross-module inlining of a shared helper. Kept
  // inside the component body (not a module-level constant) so tests can
  // toggle it per-render with vi.stubEnv.
  const mockApiEnabled = import.meta.env.VITE_MOCK_API === "true";
  const backendStatus = useBackendAvailability();
  const { config } = useClientConfig(backendStatus);
  const run = useStitchRun(config, undefined, backendStatus);
  const [debugState, setDebugState] = useState<DebugStateKey | null>(null);

  function handleDebugSelect(key: DebugStateKey) {
    setDebugState(key);
    run.forceDebugState(key);
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
              <rect
                x="1.5"
                y="6"
                width="14"
                height="14"
                rx="3"
                fill="none"
                stroke="currentColor"
                strokeOpacity=".45"
                strokeWidth="1.5"
              />
              <rect
                x="10.5"
                y="6"
                width="14"
                height="14"
                rx="3"
                fill="var(--accent)"
                fillOpacity=".22"
                stroke="var(--accent)"
                strokeWidth="1.5"
              />
            </svg>
            <span className="brand-name">Automatic Panorama Stitcher</span>
          </div>
          <span className="crumb">SIFT / ORB · RANSAC · warp · blend</span>
          <span className="spacer" />
          <span className="privacy">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Processed in memory · never stored
          </span>
          <StatusPill status={backendStatus} />
        </div>
      </header>

      <main className="shell">
        {mockApiEnabled && <StateSwitcher current={debugState} onSelect={handleDebugSelect} />}

        <div className="pagehead">
          <div>
            <h1>Stitch overlapping photos into one panorama</h1>
            <p>
              Upload {MIN_FILES}–{config.max_upload_files} frames in capture order. Every seam
              comes with the evidence behind it.
            </p>
          </div>
        </div>

        <div className="work">
          <ControlRail
            state={run.state}
            files={run.files}
            preparedImages={run.preparedImages}
            config={config}
            fileErrors={run.fileErrors}
            totalError={run.totalError}
            selectionError={run.selectionError}
            error={run.error}
            busySecondsLeft={run.busySecondsLeft}
            hasPreflightErrors={run.hasPreflightErrors}
            onFilesSelected={run.addFiles}
            onFileRemoved={run.removeFile}
            detector={run.detector}
            onDetectorChange={run.setDetector}
            ratioThreshold={run.ratioThreshold}
            onRatioChange={run.setRatioThreshold}
            ransacThreshold={run.ransacThreshold}
            onRansacChange={run.setRansacThreshold}
            onSubmit={run.submit}
            onCancel={run.cancel}
            cancelledNote={run.cancelledNote}
          />
          <OutputCanvas
            state={run.state}
            isColdStart={run.isColdStart}
            error={run.error}
            result={run.result}
            isStale={run.isStale}
            config={config}
            files={run.files}
          />
        </div>

        {run.result && <Diagnostics result={run.result} files={run.files} />}
      </main>
    </>
  );
}
