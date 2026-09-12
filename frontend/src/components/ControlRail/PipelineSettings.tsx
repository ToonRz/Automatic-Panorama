import {
  RANSAC_MAX,
  RANSAC_MIN,
  RANSAC_STEP,
  RATIO_MAX,
  RATIO_MIN,
  RATIO_STEP,
} from "../../constants/thresholds";
import type { Detector } from "../../types";

export interface PipelineSettingsProps {
  detector: Detector;
  onDetectorChange: (detector: Detector) => void;
  ratioThreshold: number;
  onRatioChange: (value: number) => void;
  ransacThreshold: number;
  onRansacChange: (value: number) => void;
  disabled: boolean;
}

export function PipelineSettings({
  detector,
  onDetectorChange,
  ratioThreshold,
  onRatioChange,
  ransacThreshold,
  onRansacChange,
  disabled,
}: PipelineSettingsProps) {
  return (
    <>
      <div className="field">
        <label className="field-label" htmlFor="detector">
          Feature detector
        </label>
        <select
          id="detector"
          value={detector}
          disabled={disabled}
          onChange={(event) => onDetectorChange(event.target.value as Detector)}
        >
          <option value="SIFT">SIFT · scale-invariant, slower</option>
          <option value="ORB">ORB · binary, faster</option>
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="ratio">
          Lowe ratio test <output htmlFor="ratio">{ratioThreshold.toFixed(2)}</output>
        </label>
        <input
          id="ratio"
          type="range"
          min={RATIO_MIN}
          max={RATIO_MAX}
          step={RATIO_STEP}
          value={ratioThreshold}
          disabled={disabled}
          onChange={(event) => onRatioChange(Number(event.target.value))}
        />
        <span className="hint">
          Lower keeps only descriptor matches that are clearly better than their runner-up.
        </span>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="ransac">
          RANSAC tolerance <output htmlFor="ransac">{ransacThreshold.toFixed(1)} px</output>
        </label>
        <input
          id="ransac"
          type="range"
          min={RANSAC_MIN}
          max={RANSAC_MAX}
          step={RANSAC_STEP}
          value={ransacThreshold}
          disabled={disabled}
          onChange={(event) => onRansacChange(Number(event.target.value))}
        />
        <span className="hint">
          Largest reprojection error a correspondence may have and still count as an inlier.
        </span>
      </div>
    </>
  );
}
