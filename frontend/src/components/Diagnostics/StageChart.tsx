import { Fragment } from "react";

import { PIPELINE_STAGES } from "../../constants/pipeline";
import { max, sum } from "../../utils/stitchStats";

export interface StageChartProps {
  stageTimingsMs: Record<string, number>;
}

/**
 * docs/ui-spec.md section 6.1: bar width is the stage over the largest
 * stage, and a key this UI does not recognise still renders as an extra
 * bar rather than being dropped.
 */
export function StageChart({ stageTimingsMs }: StageChartProps) {
  const knownKeys = new Set(PIPELINE_STAGES.map((stage) => stage.key));
  const orderedKeys = [
    ...PIPELINE_STAGES.map((stage) => stage.key).filter((key) => key in stageTimingsMs),
    ...Object.keys(stageTimingsMs).filter((key) => !knownKeys.has(key)),
  ];
  const values = orderedKeys.map((key) => stageTimingsMs[key]);
  const peak = values.length > 0 ? max(values) : 0;
  const total = sum(values);

  return (
    <div className="chart">
      <div className="kicker" style={{ color: "var(--muted)" }}>
        Stage timings · {total.toFixed(1)} ms total
      </div>
      <div className="bars" style={{ marginTop: 14 }}>
        {orderedKeys.map((key) => {
          const value = stageTimingsMs[key];
          const widthPct = peak > 0 ? (value / peak) * 100 : 0;
          return (
            <Fragment key={key}>
              <span className="lab">{key}</span>
              <div className="track">
                <div
                  className={value === peak ? "fill peak" : "fill"}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className="val">{value.toFixed(1)}</span>
            </Fragment>
          );
        })}
      </div>
      <div className="axis">
        <span />
        <div className="ticks">
          <span>0</span>
          <span>{Math.round(peak / 3)}</span>
          <span>{Math.round((peak * 2) / 3)}</span>
          <span>{Math.round(peak)} ms</span>
        </div>
        <span />
      </div>
    </div>
  );
}
