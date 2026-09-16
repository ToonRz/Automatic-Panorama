import { PanelHead } from "../PanelHead";
import type { FailedDetail, ScreenState } from "../../hooks/useStitchRun";
import type { ClientConfig, Detector } from "../../types";
import { formatBytes } from "../../utils/formatBytes";
import { framesNamedByError } from "../../utils/frameLabel";
import type { PreparedImage } from "../../utils/prepareImage";
import { Dropzone } from "./Dropzone";
import { FileList } from "./FileList";
import { PipelineSettings } from "./PipelineSettings";
import { ExampleGallery } from "../ExampleGallery/ExampleGallery";
import "../ExampleGallery/ExampleGallery.css";

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
  onFileRemoved: (index: number) => void;
  detector: Detector;
  onDetectorChange: (detector: Detector) => void;
  ratioThreshold: number;
  onRatioChange: (value: number) => void;
  ransacThreshold: number;
  onRansacChange: (value: number) => void;
  onSubmit: (overrides?: { detector?: Detector }) => void;
  onCancel: () => void;
  cancelledNote: string | null;
  hasPreflightErrors: boolean;
  onReset?: () => void;
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
  onFileRemoved,
  detector,
  onDetectorChange,
  ratioThreshold,
  onRatioChange,
  ransacThreshold,
  onRansacChange,
  onSubmit,
  onCancel,
  cancelledNote,
  hasPreflightErrors,
  onReset,
}: ControlRailProps) {
  const primary = primaryButtonSpec(state, detector, hasPreflightErrors, busySecondsLeft);
  const showDropzone =
    state === "empty" || state === "preparing" || state === "ready" || state === "failed";
  const canClearOrRemove = state !== "working" && state !== "preparing";
  const settingsDisabled = state === "working" || state === "preparing";
  const highlightedIndices =
    state === "failed" ? framesNamedByError(error?.detail) : new Set<number>();
  const totalBytes = files.reduce(
    (total, file, index) => total + (preparedImages[index]?.upload.size ?? file.size),
    0,
  );

  return (
    <form
      className="panel rail stack"
      aria-label="Controls"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(primary.detectorOverride ? { detector: primary.detectorOverride } : undefined);
      }}
    >
      <PanelHead
        index={1}
        title="Source frames"
        aside={
          <div className="head-aside-group">
            {files.length > 0 && canClearOrRemove && onReset && (
              <button
                type="button"
                className="btn-clear-all"
                onClick={onReset}
                title="Clear all images"
              >
                Clear all
              </button>
            )}
            <span className="mono">
              <b>{files.length}</b> / {config.max_upload_files}
            </span>
          </div>
        }
      />
      <div className="section">
        {showDropzone && (
          <Dropzone onFilesSelected={onFilesSelected} config={config} fileCount={files.length} />
        )}
        {selectionError && (
          <p className="selection-error" role="alert">
            {selectionError}
          </p>
        )}
        {cancelledNote && <p className="cancelled-note">{cancelledNote}</p>}
        <FileList
          files={files}
          preparedImages={preparedImages}
          fileErrors={fileErrors}
          totalError={totalError}
          totalBytes={totalBytes}
          highlightedIndices={highlightedIndices}
          onRemove={canClearOrRemove ? onFileRemoved : undefined}
        />
        {showDropzone && (
          <ExampleGallery onLoadSample={onFilesSelected} />
        )}
      </div>

      <PanelHead index={2} title="Method" aside="Defaults from server" />
      <div className="section">
        <PipelineSettings
          detector={detector}
          onDetectorChange={onDetectorChange}
          ratioThreshold={ratioThreshold}
          onRatioChange={onRatioChange}
          ransacThreshold={ransacThreshold}
          onRansacChange={onRansacChange}
          disabled={settingsDisabled}
        />
      </div>

      <div className="action">
        <button className={primary.ghost ? "cta ghost" : "cta"} type="submit" disabled={primary.disabled}>
          {primary.label}
        </button>
        {state === "complete" && onReset && (
          <button
            type="button"
            className="cancel"
            onClick={onReset}
          >
            + Start new panorama
          </button>
        )}
        {state === "working" && (
          <button type="button" className="cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
        {files.length > 0 && (
          <div className="action-meta">
            <span>
              {files.length} frames · {detector}
            </span>
            <span className="mono">≈ {formatBytes(totalBytes)} upload</span>
          </div>
        )}
      </div>
    </form>
  );
}
