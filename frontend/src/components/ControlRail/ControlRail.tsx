import type { FailedDetail, ScreenState } from "../../hooks/useStitchRun";
import type { ClientConfig, Detector } from "../../types";
import { framesNamedByError } from "../../utils/frameLabel";
import type { PreparedImage } from "../../utils/prepareImage";
import { Dropzone } from "./Dropzone";
import { FileList } from "./FileList";
import { PipelineSettings } from "./PipelineSettings";

export interface ControlRailProps {
  state: ScreenState;
  files: File[];
  preparedImages: Array<PreparedImage | null>;
  config: ClientConfig;
  fileErrors: Array<string | null>;
  totalError: string | null;
  selectionError: string | null;
  error: FailedDetail | null;
  busySecondsLeft: number | null;
  onFilesSelected: (files: File[]) => void;
  detector: Detector;
  onDetectorChange: (detector: Detector) => void;
  ratioThreshold: number;
  onRatioChange: (value: number) => void;
  ransacThreshold: number;
  onRansacChange: (value: number) => void;
  onSubmit: (overrides?: { detector?: Detector }) => void;
  hasPreflightErrors: boolean;
}

interface PrimaryButtonSpec {
  label: string;
  disabled: boolean;
  ghost: boolean;
  detectorOverride?: Detector;
}

function primaryButtonSpec(
  state: ScreenState,
  detector: Detector,
  hasPreflightErrors: boolean,
  busySecondsLeft: number | null,
): PrimaryButtonSpec {
  if (hasPreflightErrors) {
    return { label: "Fix the marked frames", disabled: true, ghost: false };
  }
  // docs/integration-spec.md section 7.3: the button stays locked until the
  // server-stated wait passes, with no automatic retry.
  if (state === "failed" && busySecondsLeft !== null && busySecondsLeft > 0) {
    return { label: `Try again in ${busySecondsLeft}s`, disabled: true, ghost: true };
  }
  switch (state) {
    case "empty":
      return { label: "Add two frames to start", disabled: true, ghost: false };
    case "ready":
      return { label: "Stitch panorama", disabled: false, ghost: false };
    case "preparing":
      return { label: "Preparing images…", disabled: true, ghost: false };
    case "working":
      return { label: "Stitching…", disabled: true, ghost: false };
    case "complete":
      return { label: "Stitch again", disabled: false, ghost: false };
    case "failed":
      return detector === "SIFT"
        ? { label: "Retry with ORB", disabled: false, ghost: true, detectorOverride: "ORB" }
        : { label: "Try again", disabled: false, ghost: true };
  }
}

export function ControlRail({
  state,
  files,
  preparedImages,
  config,
  fileErrors,
  totalError,
  selectionError,
  error,
  busySecondsLeft,
  onFilesSelected,
  detector,
  onDetectorChange,
  ratioThreshold,
  onRatioChange,
  ransacThreshold,
  onRansacChange,
  onSubmit,
  hasPreflightErrors,
}: ControlRailProps) {
  const primary = primaryButtonSpec(state, detector, hasPreflightErrors, busySecondsLeft);
  const showDropzone =
    state === "empty" || state === "preparing" || state === "ready" || state === "failed";
  const settingsDisabled = state === "working" || state === "preparing";
  const highlightedIndices =
    state === "failed" ? framesNamedByError(error?.detail) : new Set<number>();

  return (
    <form
      className="panel stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(primary.detectorOverride ? { detector: primary.detectorOverride } : undefined);
      }}
    >
      <div className="panel-head">
        <div>
          <span className="kicker">Input</span>
          <h2>Source frames</h2>
        </div>
        <span className="counter">
          {files.length} / {config.max_upload_files}
        </span>
      </div>

      {showDropzone && <Dropzone onFilesSelected={onFilesSelected} config={config} />}
      {selectionError && <p className="selection-error" role="alert">{selectionError}</p>}
      <FileList
        files={files}
        preparedImages={preparedImages}
        fileErrors={fileErrors}
        totalError={totalError}
        highlightedIndices={highlightedIndices}
      />

      <div className="rule" />
      <div className="panel-head compact">
        <div>
          <span className="kicker">Method</span>
          <h2>Pipeline settings</h2>
        </div>
      </div>

      <PipelineSettings
        detector={detector}
        onDetectorChange={onDetectorChange}
        ratioThreshold={ratioThreshold}
        onRatioChange={onRatioChange}
        ransacThreshold={ransacThreshold}
        onRansacChange={onRansacChange}
        disabled={settingsDisabled}
      />

      <button className={primary.ghost ? "cta ghost" : "cta"} type="submit" disabled={primary.disabled}>
        {primary.label} <span aria-hidden="true">{primary.disabled && state === "working" ? "◍" : "→"}</span>
      </button>
    </form>
  );
}
