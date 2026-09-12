import type { SeamLine, StitchCorrespondence } from "../../types";

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
              style={{ stroke: "var(--aqua)" }}
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
                  style={{ stroke: "var(--ink)" }}
                  strokeWidth={1.6}
                  opacity={0.35}
                />
                <circle
                  cx={sample.from[0]}
                  cy={sample.from[1]}
                  r={9}
                  fill="none"
                  style={{ stroke: "var(--coral)" }}
                  strokeWidth={2}
                  opacity={0.75}
                />
                <circle
                  cx={sample.to[0]}
                  cy={sample.to[1]}
                  r={9}
                  fill="none"
                  style={{ stroke: "var(--coral)" }}
                  strokeWidth={2}
                  opacity={0.75}
                />
              </g>
            ))}
            <text
              x={seam.top[0] + 12}
              y={seam.top[1] + 28}
              style={{ fill: "var(--aqua)", fontFamily: "var(--mono)" }}
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
