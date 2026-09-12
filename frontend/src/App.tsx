import { useState } from "react";

import { ControlRail } from "./components/ControlRail/ControlRail";
import { Diagnostics } from "./components/Diagnostics/Diagnostics";
import { OutputCanvas } from "./components/OutputCanvas/OutputCanvas";
import { StatusPill } from "./components/StatusPill";
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
    <main className="sheet">
      {mockApiEnabled && <StateSwitcher current={debugState} onSelect={handleDebugSelect} />}

      <header className="hero">
        <h1>Automatic Panorama Stitcher</h1>
        <p>
          Turn overlapping photographs into one wide view with an explainable SIFT/ORB pipeline.
        </p>
        <StatusPill status={backendStatus} />
      </header>

      <div className="workspace">
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
          onFilesSelected={run.setFiles}
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

      <footer className="appfoot">Images are processed in memory and never stored.</footer>
    </main>
  );
}
