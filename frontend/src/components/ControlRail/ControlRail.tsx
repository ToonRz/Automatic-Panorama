import type { ScreenState } from "../../hooks/useStitchRun";
import { MAX_FILES } from "../../constants/thresholds";
import type { Detector } from "../../types";
import { Dropzone } from "./Dropzone";
import { FileList } from "./FileList";
import { PipelineSettings } from "./PipelineSettings";

export interface ControlRailProps {
  state: ScreenState;
  files: File[];
  onFilesSelected: (files: File[]) => void;
  detector: Detector;
  onDetectorChange: (detector: Detector) => void;
  ratioThreshold: number;
  onRatioChange: (value: number) => void;
  ransacThreshold: number;
  onRansacChange: (value: number) => void;
  onSubmit: (overrides?: { detector?: Detector }) => void;
}

interface PrimaryButtonSpec {
  label: string;
  disabled: boolean;
  ghost: boolean;
  detectorOverride?: Detector;
}

function primaryButtonSpec(state: ScreenState, detector: Detector): PrimaryButtonSpec {
  switch (state) {
    case "empty":
      return { label: "Add two frames to start", disabled: true, ghost: false };
    case "ready":
      return { label: "Stitch panorama", disabled: false, ghost: false };
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
  onFilesSelected,
  detector,
  onDetectorChange,
  ratioThreshold,
  onRatioChange,
  ransacThreshold,
  onRansacChange,
  onSubmit,
}: ControlRailProps) {
  const primary = primaryButtonSpec(state, detector);
  const showDropzone = state === "empty" || state === "ready" || state === "failed";
  const settingsDisabled = state === "working";

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
          {files.length} / {MAX_FILES}
        </span>
      </div>

      {showDropzone && <Dropzone onFilesSelected={onFilesSelected} />}
      <FileList files={files} />

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
      <p className="fineprint">Frames are processed in memory. Nothing is stored.</p>
    </form>
  );
}
