import type { SeamLine, StitchCorrespondence } from "../../types";

const LABEL_GAP = 12;
const LABEL_BASELINE = 28;
export const LABEL_LINE_HEIGHT = 32;
/** Rough rendered width of "SEAM 01 · 999 inliers" at 22px mono, letter-spaced. */
export const LABEL_WIDTH = 330;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface LabelPosition {
  x: number;
  y: number;
  textAnchor: "start" | "end";
}

/**
 * Anchors each label beside its seam's top point, but inside the image: the
 * crop can leave a seam's top point above the panorama, and a seam near the
 * right border has no room for a label on its right, so it flips to the left.
 * All labels sit on lines below one shared top, the highest seam top point
 * inside the image. A label takes the first line where its box does not
 * overlap an earlier label's, so labels of close seams do not overprint each
 * other whatever the seams' own top points are.
 */
function labelPositions(seamLines: SeamLine[], width: number, height: number): LabelPosition[] {
  const lines: Array<Array<[number, number]>> = [];
  const placed = seamLines.map((seam) => {
    const x = clamp(seam.top[0], 0, width);
    const start = x + LABEL_GAP + LABEL_WIDTH <= width;
    const left = start ? x + LABEL_GAP : x - LABEL_GAP - LABEL_WIDTH;
    const right = left + LABEL_WIDTH;
    let line = 0;
    while (lines[line]?.some(([l, r]) => left < r && l < right)) line += 1;
    (lines[line] ??= []).push([left, right]);
    return { line, x: start ? left : right, textAnchor: start ? "start" : "end" } as const;
  });
  const deepest = LABEL_BASELINE + (lines.length - 1) * LABEL_LINE_HEIGHT;
  const highest = Math.min(...seamLines.map((seam) => seam.top[1]));
  const top = clamp(highest, 0, Math.max(0, height - deepest));
  return placed.map(({ line, x, textAnchor }) => ({
    x,
    y: top + LABEL_BASELINE + line * LABEL_LINE_HEIGHT,
    textAnchor,
  }));
}

export interface OverlayProps {
  width: number;
  height: number;
  seamLines: SeamLine[];
  correspondencesPerPair: StitchCorrespondence[][];
  inliersPerPair: number[];
}

/**
 * docs/ui-spec.md section 6.2. Drawn in the panorama's own coordinate space
 * (viewBox = output pixel dimensions) so it stays sharp at any display size
 * and the frontend applies no geometry of its own. The sampled
 * correspondences are an illustration; the printed count is always
 * `inliers_per_pair`, never the number of points drawn.
 */
export function Overlay({
  width,
  height,
  seamLines,
  correspondencesPerPair,
  inliersPerPair,
}: OverlayProps) {
  const labels = labelPositions(seamLines, width, height);
  return (
    <svg
      className="overlay"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Seam and inlier overlay"
    >
      {seamLines.map((seam, index) => {
        const samples = correspondencesPerPair[index] ?? [];
        const inliers = inliersPerPair[index];
        return (
          <g key={index}>
            <line
              x1={seam.top[0]}
              y1={seam.top[1]}
              x2={seam.bottom[0]}
              y2={seam.bottom[1]}
              style={{ stroke: "var(--pass)" }}
              strokeWidth={2.5}
              strokeDasharray="14 12"
              opacity={0.85}
            />
            {samples.map((sample, sampleIndex) => (
              <g key={sampleIndex}>
                <line
                  x1={sample.from[0]}
                  y1={sample.from[1]}
                  x2={sample.to[0]}
                  y2={sample.to[1]}
                  style={{ stroke: "var(--text)" }}
                  strokeWidth={1.6}
                  opacity={0.35}
                />
                <circle
                  cx={sample.from[0]}
                  cy={sample.from[1]}
                  r={9}
                  fill="none"
                  style={{ stroke: "var(--fail)" }}
                  strokeWidth={2}
                  opacity={0.75}
                />
                <circle
                  cx={sample.to[0]}
                  cy={sample.to[1]}
                  r={9}
                  fill="none"
                  style={{ stroke: "var(--fail)" }}
                  strokeWidth={2}
                  opacity={0.75}
                />
              </g>
            ))}
            <text
              {...labels[index]}
              style={{ fill: "var(--pass)", fontFamily: "var(--mono)" }}
              fontSize={22}
              letterSpacing={2}
            >
              SEAM {String(index + 1).padStart(2, "0")} · {inliers} inliers
            </text>
          </g>
        );
      })}
    </svg>
  );
}
