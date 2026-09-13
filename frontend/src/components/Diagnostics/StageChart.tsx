import { PIPELINE_STAGES } from "../../constants/pipeline";
import { max, sum } from "../../utils/stitchStats";

export interface StageChartProps {
  stageTimingsMs: Record<string, number> | null;
}

/**
 * docs/ui-spec.md section 6.1/6.4: bar width is the stage over the largest
 * stage, the peak bar at full opacity and the rest at 85%, and a key this
 * UI does not recognise still renders as an extra bar using the raw key as
 * its label rather than being dropped. With no result, the panel keeps its
 * head and shows the section 6.4 placeholder text instead of any bar.
 */
export function StageChart({ stageTimingsMs }: StageChartProps) {
  if (!stageTimingsMs) {
    return (
      <div className="panel stagechart">
        <div className="panel-head">
          <h2>Stage timings</h2>
        </div>
        <div className="bars-empty">Timings arrive with the response</div>
      </div>
    );
  }

  const knownKeys = new Set(PIPELINE_STAGES.map((stage) => stage.key));
  const orderedKeys = [
    ...PIPELINE_STAGES.map((stage) => stage.key).filter((key) => key in stageTimingsMs),
    ...Object.keys(stageTimingsMs).filter((key) => !knownKeys.has(key)),
  ];
  const values = orderedKeys.map((key) => stageTimingsMs[key]);
  const peak = values.length > 0 ? max(values) : 0;
  const total = sum(values);

  return (
    <div className="panel stagechart">
      <div className="panel-head">
        <h2>Stage timings</h2>
        <span className="aside mono">{total.toFixed(1)} ms total</span>
      </div>
      <div className="bars">
        {orderedKeys.map((key) => {
          const value = stageTimingsMs[key];
          const widthPct = peak > 0 ? (value / peak) * 100 : 0;
          return (
            <div className="barrow" key={key}>
              <span className="lab">{key}</span>
              <span className="track">
                <span className={value === peak ? "fill peak" : "fill"} style={{ width: `${widthPct}%` }} />
              </span>
              <span className="val">{value.toFixed(1)} ms</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
