import type { CSSProperties } from "react";

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

function sliderFillStyle(value: number, min: number, max: number): CSSProperties {
  const percent = Math.round((((value - min) / (max - min)) * 100 + Number.EPSILON) * 100) / 100;
  return { "--p": `${percent}%` } as CSSProperties;
}

/**
 * docs/ui-spec.md section 3.1: the detector is a native radiogroup (visually
 * a segmented control) so arrow keys move the selection for free, and each
 * slider exposes its fill as the `--p` custom property the rail CSS reads.
 */
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
      <div className="label-row">
        <span className="label">Feature detector</span>
      </div>
      <div className="seg" role="radiogroup" aria-label="Feature detector">
        <label className="seg-option">
          <input
            type="radio"
            name="detector"
            className="sr-only"
            aria-label="SIFT"
            checked={detector === "SIFT"}
            disabled={disabled}
            onChange={() => onDetectorChange("SIFT")}
          />
          <span className="seg-name">SIFT</span>
          <span className="seg-sub">Scale-invariant · slower</span>
        </label>
        <label className="seg-option">
          <input
            type="radio"
            name="detector"
            className="sr-only"
            aria-label="ORB"
            checked={detector === "ORB"}
            disabled={disabled}
            onChange={() => onDetectorChange("ORB")}
          />
          <span className="seg-name">ORB</span>
          <span className="seg-sub">Binary · faster</span>
        </label>
      </div>

      <div className="field">
        <div className="field-top">
          <label className="label" htmlFor="ratio">
            Lowe ratio test
          </label>
          <output className="val mono" htmlFor="ratio">
            {ratioThreshold.toFixed(2)}
          </output>
        </div>
        <input
          id="ratio"
          type="range"
          min={RATIO_MIN}
          max={RATIO_MAX}
          step={RATIO_STEP}
          value={ratioThreshold}
          disabled={disabled}
          style={sliderFillStyle(ratioThreshold, RATIO_MIN, RATIO_MAX)}
          onChange={(event) => onRatioChange(Number(event.target.value))}
        />
        <div className="scale">
          <span>{RATIO_MIN.toFixed(2)} strict</span>
          <span>{RATIO_MAX.toFixed(2)} loose</span>
        </div>
        <p className="hint">Keeps a match only when it clearly beats its runner-up.</p>
      </div>

      <div className="field">
        <div className="field-top">
          <label className="label" htmlFor="ransac">
            RANSAC tolerance
          </label>
          <output className="val mono" htmlFor="ransac">
            {ransacThreshold.toFixed(1)} px
          </output>
        </div>
        <input
          id="ransac"
          type="range"
          min={RANSAC_MIN}
          max={RANSAC_MAX}
          step={RANSAC_STEP}
          value={ransacThreshold}
          disabled={disabled}
          style={sliderFillStyle(ransacThreshold, RANSAC_MIN, RANSAC_MAX)}
          onChange={(event) => onRansacChange(Number(event.target.value))}
        />
        <div className="scale">
          <span>{RANSAC_MIN} px</span>
          <span>{RANSAC_MAX} px</span>
        </div>
        <p className="hint">Largest reprojection error that still counts as an inlier.</p>
      </div>
    </>
  );
}
