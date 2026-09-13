import type { SeamLine, StitchCorrespondence } from "../../types";

const LABEL_GAP = 12;
const LABEL_BASELINE = 28;
const LABEL_LINE_HEIGHT = 32;
/** Rough rendered width of "SEAM 01 · 999 inliers" at 22px mono, letter-spaced. */
const LABEL_WIDTH = 330;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Anchors the label at the seam's top point, but inside the image: the crop
 * can leave a seam's top point above the panorama, and a seam near the right
 * border has no room for a label on its right, so it flips to the left.
 * Each seam's label drops one line below the previous seam's, so labels of
 * close seams do not overprint each other.
 */
function labelPosition(seam: SeamLine, index: number, width: number, height: number) {
  const x = clamp(seam.top[0], 0, width);
  const baseline = LABEL_BASELINE + index * LABEL_LINE_HEIGHT;
  const y = clamp(seam.top[1], 0, Math.max(0, height - baseline)) + baseline;
  return x + LABEL_GAP + LABEL_WIDTH <= width
    ? { x: x + LABEL_GAP, y, textAnchor: "start" as const }
    : { x: x - LABEL_GAP, y, textAnchor: "end" as const };
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
              {...labelPosition(seam, index, width, height)}
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
