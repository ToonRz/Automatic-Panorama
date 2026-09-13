import type { Detector } from "../../types";

export interface EmptyStateProps {
  state: "empty" | "preparing" | "ready";
  fileCount: number;
  detector: Detector;
  ratioThreshold: number;
  ransacThreshold: number;
}

/**
 * docs/ui-spec.md section 3.1: a decorative frames illustration, copy built
 * from the current selection and settings for `preparing`/`ready`, and the
 * three-colour status legend. `empty` uses fixed copy; the illustration has
 * no motion here (that cue belongs to `WorkingState` alone, section 2.3).
 */
export function EmptyState({ state, fileCount, detector, ratioThreshold, ransacThreshold }: EmptyStateProps) {
  return (
    <div className="placeholder">
      <svg className="frames" width="300" height="130" viewBox="0 0 300 130" aria-hidden="true">
        <g>
          <rect x="10" y="20" width="120" height="90" rx="8" />
          <text x="20" y="40">01</text>
        </g>
        <g>
          <rect x="170" y="20" width="120" height="90" rx="8" />
          <text x="180" y="40">03</text>
        </g>
        <g>
          <rect x="90" y="20" width="120" height="90" rx="8" />
          <text x="100" y="40">02</text>
          <rect className="ov" x="90" y="20" width="40" height="90" />
          <rect className="ov" x="170" y="20" width="40" height="90" />
        </g>
        <line x1="62" y1="62" x2="112" y2="58" />
        <line x1="70" y1="88" x2="118" y2="92" />
        <line x1="188" y1="46" x2="236" y2="50" />
        <line x1="182" y1="78" x2="240" y2="74" />
        <circle cx="112" cy="58" r="2.5" />
        <circle cx="118" cy="92" r="2.5" />
        <circle cx="188" cy="46" r="2.5" />
        <circle cx="182" cy="78" r="2.5" />
      </svg>

      {state === "empty" ? (
        <>
          <h3>The panorama lands here</h3>
          <p>
            Add at least two overlapping frames. You&rsquo;ll get the stitched image plus
            keypoints, matches, inlier ratio and reprojection error for every pair.
          </p>
        </>
      ) : (
        <>
          <h3>
            {state === "preparing"
              ? `Preparing ${fileCount} frames…`
              : `${fileCount} frames ready to stitch`}
          </h3>
          <p>
            Frames will be matched with {detector} at ratio {ratioThreshold.toFixed(2)} and
            aligned with RANSAC at {ransacThreshold.toFixed(1)} px.
          </p>
        </>
      )}

      <div className="legend">
        <span>
          <i className="pass" />
          accepted
        </span>
        <span>
          <i className="run" />
          in progress
        </span>
        <span>
          <i className="fail" />
          rejected
        </span>
      </div>
    </div>
  );
}
