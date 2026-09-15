import { useId, useMemo, useState, useRef, useEffect, useCallback } from "react";
import type { StitchDiagnostics } from "../../types";

export interface FeatureSurvivalFunnelProps {
  diagnostics: StitchDiagnostics | null;
  files?: readonly { name: string }[];
}

interface RibbonLink {
  id: string;
  fromId: string;
  toId: string;
  value: number;
  color: string;
  label: string;
}

const EMPTY_FILES: readonly { name: string }[] = [];

/**
 * Below this width the desktop Sankey (hover-driven, ribbons computed from
 * a horizontal 3-column layout) gives way to the vertical trapezoid funnel
 * — a distinct mobile layout, not a squeezed copy. Matches the 960px
 * breakpoint used elsewhere for `.work`/`.viewport` in styles.css.
 */
const COMPACT_QUERY = "(max-width: 960px)";

function useIsCompactViewport(): boolean {
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(COMPACT_QUERY).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(COMPACT_QUERY);
    const handleChange = () => setIsCompact(mql.matches);
    handleChange();
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isCompact;
}

export function FeatureSurvivalFunnel({ diagnostics, files = EMPTY_FILES }: FeatureSurvivalFunnelProps) {
  const componentId = useId();
  const isCompact = useIsCompactViewport();
  const [showTableModal, setShowTableModal] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [frameListOpen, setFrameListOpen] = useState(true);

  const stageRef = useRef<HTMLDivElement>(null);
  const [ribbonPaths, setRibbonPaths] = useState<Array<{ id: string; d: string; color: string; label: string; fromId: string; toId: string }>>([]);

  // Aggregate numbers from diagnostics
  const stats = useMemo(() => {
    if (!diagnostics) {
      return {
        totalKeypoints: 0,
        totalRatioPassed: 0,
        totalInliers: 0,
        totalOutliers: 0,
        totalDiscarded: 0,
        inlierRatioAvg: 0,
        meanReprojError: 0,
        frames: [],
      };
    }

    const totalKeypoints = diagnostics.keypoints_per_image.reduce((acc, v) => acc + v, 0);
    const totalRatioPassed = diagnostics.ratio_passed_matches_per_pair.reduce((acc, v) => acc + v, 0);
    const totalInliers = diagnostics.inliers_per_pair.reduce((acc, v) => acc + v, 0);
    const totalOutliers = Math.max(0, totalRatioPassed - totalInliers);
    const totalDiscarded = Math.max(0, totalKeypoints - totalRatioPassed);

    const pairCount = diagnostics.inlier_ratio_per_pair.length;
    const inlierRatioAvg = pairCount > 0
      ? diagnostics.inlier_ratio_per_pair.reduce((acc, v) => acc + v, 0) / pairCount
      : 0;

    const meanReprojError = pairCount > 0
      ? diagnostics.reprojection_error_per_pair.reduce((acc, v) => acc + v, 0) / pairCount
      : 0;

    const frames = diagnostics.keypoints_per_image.map((count, index) => {
      const fileName = files[index]?.name ?? `frame_${String(index + 1).padStart(2, "0")}.jpg`;
      const isAnchor = index === diagnostics.reference_index;
      return { index, fileName, count, isAnchor };
    });

    return {
      totalKeypoints,
      totalRatioPassed,
      totalInliers,
      totalOutliers,
      totalDiscarded,
      inlierRatioAvg,
      meanReprojError,
      frames,
    };
  }, [diagnostics, files]);

  // Compute flow links
  const links = useMemo<RibbonLink[]>(() => {
    if (!diagnostics || stats.frames.length === 0) return [];

    const result: RibbonLink[] = [];
    const totalKp = stats.totalKeypoints || 1;
    const totalPass = stats.totalRatioPassed;

    // Distribute ratio passed matches proportionally to frames
    stats.frames.forEach((frame) => {
      const framePassed = Math.round((frame.count / totalKp) * totalPass);
      const frameDiscarded = Math.max(0, frame.count - framePassed);

      result.push({
        id: `link-f${frame.index}-pass`,
        fromId: `node-frame-${frame.index}`,
        toId: "node-ratio-pass",
        value: framePassed,
        color: "url(#funnel-grad-emerald-blue)",
        label: `${frame.fileName} → Passed: ${framePassed.toLocaleString()} matches`,
      });

      result.push({
        id: `link-f${frame.index}-discard`,
        fromId: `node-frame-${frame.index}`,
        toId: "node-discarded",
        value: frameDiscarded,
        color: "rgba(148, 163, 184, 0.25)",
        label: `${frame.fileName} → Discarded: ${frameDiscarded.toLocaleString()} points`,
      });
    });

    // Middle to Right stage
    result.push({
      id: "link-pass-inlier",
      fromId: "node-ratio-pass",
      toId: "node-inliers",
      value: stats.totalInliers,
      color: "url(#funnel-grad-blue-green)",
      label: `Ratio Pass → RANSAC Inliers: ${stats.totalInliers.toLocaleString()}`,
    });

    if (stats.totalOutliers > 0) {
      result.push({
        id: "link-pass-outlier",
        fromId: "node-ratio-pass",
        toId: "node-outliers",
        value: stats.totalOutliers,
        color: "rgba(239, 68, 68, 0.4)",
        label: `Ratio Pass → Outliers: ${stats.totalOutliers.toLocaleString()}`,
      });
    }

    result.push({
      id: "link-discard-outlier",
      fromId: "node-discarded",
      toId: "node-outliers",
      value: Math.min(stats.totalDiscarded, 120),
      color: "rgba(148, 163, 184, 0.18)",
      label: "Filtered non-consensus points",
    });

    return result;
  }, [diagnostics, stats]);

  // Recalculate SVG ribbon paths based on DOM node positions
  const updateRibbonLayout = useCallback(() => {
    if (!stageRef.current || links.length === 0) {
      setRibbonPaths([]);
      return;
    }

    const stageRect = stageRef.current.getBoundingClientRect();
    const paths: Array<{ id: string; d: string; color: string; label: string; fromId: string; toId: string }> = [];

    links.forEach((link) => {
      const fromEl = document.getElementById(link.fromId);
      const toEl = document.getElementById(link.toId);
      if (!fromEl || !toEl) return;

      const r1 = fromEl.getBoundingClientRect();
      const r2 = toEl.getBoundingClientRect();

      const x0 = r1.right - stageRect.left;
      const y0 = r1.top + r1.height / 2 - stageRect.top;
      const x1 = r2.left - stageRect.left;
      const y1 = r2.top + r2.height / 2 - stageRect.top;

      const thickness = Math.max(3, Math.min(26, Math.sqrt(link.value) * 0.48));
      const dx = (x1 - x0) * 0.48;

      const d = `
        M ${x0} ${y0 - thickness / 2}
        C ${x0 + dx} ${y0 - thickness / 2}, ${x1 - dx} ${y1 - thickness / 2}, ${x1} ${y1 - thickness / 2}
        L ${x1} ${y1 + thickness / 2}
        C ${x1 - dx} ${y1 + thickness / 2}, ${x0 + dx} ${y0 + thickness / 2}, ${x0} ${y0 + thickness / 2}
        Z
      `;

      paths.push({
        id: link.id,
        d,
        color: link.color,
        label: link.label,
        fromId: link.fromId,
        toId: link.toId,
      });
    });

    setRibbonPaths(paths);
  }, [links]);

  useEffect(() => {
    updateRibbonLayout();
    const handleResize = () => updateRibbonLayout();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateRibbonLayout]);

  const handleMouseMove = (e: React.MouseEvent, label: string) => {
    setTooltip({
      text: label,
      x: e.pageX + 12,
      y: e.pageY - 28,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
    setHoveredNode(null);
    setHoveredLink(null);
  };

  const maxFrameKeypoints = Math.max(1, ...stats.frames.map((f) => f.count));
  const discardedPct = stats.totalKeypoints > 0 ? (stats.totalDiscarded / stats.totalKeypoints) * 100 : 0;
  const outlierPct = stats.totalRatioPassed > 0 ? (stats.totalOutliers / stats.totalRatioPassed) * 100 : 0;
  const survivalPct = stats.totalKeypoints > 0 ? (stats.totalInliers / stats.totalKeypoints) * 100 : 0;
  const anchorFrame = stats.frames.find((f) => f.isAnchor) ?? null;

  return (
    <div className="funnel-card" aria-label="Feature Survival Funnel">
      <div className="funnel-header">
        <div className="funnel-title-group">
          <div className="funnel-title-row">
            <h3>Feature &amp; Inlier Survival Funnel</h3>
            <span
              className="funnel-info-circle"
              title="Feature survival diagnostics: Left counts keypoints per frame, middle counts ratio test matches, right counts RANSAC consensus inliers."
            >
              ⓘ
            </span>
          </div>
          <div className="funnel-subtitle">
            {isCompact ? (
              diagnostics ? (
                <>
                  {stats.frames.length} frames → {stats.totalRatioPassed.toLocaleString()} matches → {stats.totalInliers.toLocaleString()} inliers survive RANSAC.
                </>
              ) : (
                "Counts keypoints per frame, ratio-test matches, and RANSAC consensus outcomes."
              )
            ) : (
              "Left column counts keypoints extracted per frame; middle column counts match filtering; right column counts RANSAC consensus outcomes."
            )}
          </div>
        </div>

        <div className="funnel-actions">
          <button
            type="button"
            className="funnel-btn-outline"
            onClick={() => setShowTableModal(true)}
            aria-label="View as table"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            View as table
          </button>
        </div>
      </div>

      {diagnostics ? (
        <>
          {isCompact ? (
            <>
              {/* Vertical trapezoid funnel — mobile-only layout, see docs/mockups */}
              <div className="mtrapezoid">
                <div className="mtrapezoid-stage s1">
                  <div className="lab">
                    <span className="name">Keypoints extracted</span>
                    <span className="sub">
                      {stats.frames.length} frames, {diagnostics.detector}
                    </span>
                  </div>
                  <span className="num">{stats.totalKeypoints.toLocaleString()}</span>
                </div>
                <div className="mtrapezoid-conn">
                  <span className="line" />
                  <span className="chip">
                    <b>−{stats.totalDiscarded.toLocaleString()}</b> discarded · {discardedPct.toFixed(1)}%
                  </span>
                  <span className="line" />
                </div>
                <div className="mtrapezoid-stage s2">
                  <div className="lab">
                    <span className="name">Passed Lowe's ratio</span>
                    <span className="sub">≤ 0.75 test</span>
                  </div>
                  <span className="num">{stats.totalRatioPassed.toLocaleString()}</span>
                </div>
                <div className="mtrapezoid-conn">
                  <span className="line" />
                  <span className="chip">
                    <b>−{stats.totalOutliers.toLocaleString()}</b> outliers · {outlierPct.toFixed(1)}%
                  </span>
                  <span className="line" />
                </div>
                <div className="mtrapezoid-stage s3">
                  <div className="lab">
                    <span className="name">RANSAC inliers</span>
                    <span className="sub">consensus set</span>
                  </div>
                  <span className="num">{stats.totalInliers.toLocaleString()}</span>
                </div>
              </div>

              <div className="mtrapezoid-survival">
                {stats.totalInliers.toLocaleString()} of {stats.totalKeypoints.toLocaleString()} keypoints survived ·{" "}
                <b>{survivalPct.toFixed(1)}%</b>
              </div>

              <div className={`mframes ${frameListOpen ? "open" : ""}`}>
                <button
                  type="button"
                  className="mframes-head"
                  onClick={() => setFrameListOpen((open) => !open)}
                  aria-expanded={frameListOpen}
                >
                  <span className="t">Frames · {stats.frames.length}</span>
                  <svg className="chev" width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
                    <path
                      d="M1 1.5L6 6.5L11 1.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <div className="mframes-list">
                  {stats.frames.map((frame) => (
                    <div className="mframe-row" key={frame.index}>
                      <div className="top">
                        <span className="name">
                          {frame.fileName} {frame.isAnchor ? <span className="mframe-anchor">ANCHOR</span> : null}
                        </span>
                        <span className="count">{frame.count.toLocaleString()}</span>
                      </div>
                      <div className="mframe-track">
                        <div
                          className="mframe-fill"
                          style={{ width: `${Math.round((frame.count / maxFrameKeypoints) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="moutcomes">
                <div className="mchip pass">
                  <span className="dot">✓</span>
                  <div className="txt">
                    <span className="l">RANSAC inliers</span>
                    <span className="v">{stats.totalInliers.toLocaleString()}</span>
                  </div>
                </div>
                <div className="mchip half anchor">
                  <span className="dot">⚓</span>
                  <div className="txt">
                    <span className="l">Anchor frame</span>
                    <span className="v">{anchorFrame ? anchorFrame.fileName : "—"}</span>
                  </div>
                </div>
                <div className="mchip half warn">
                  <span className="dot">✕</span>
                  <div className="txt">
                    <span className="l">Outliers filtered</span>
                    <span className="v">{stats.totalOutliers.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Column Titles */}
              <div className="funnel-col-headers">
                <div className="funnel-col-title">
                  <div className="funnel-bar col-green" />
                  Keypoints by frame <span className="funnel-unit">(points)</span>
                </div>
                <div className="funnel-col-title col-center">
                  <div className="funnel-bar col-blue" />
                  Matching filter outcome <span className="funnel-unit">(matches)</span>
                </div>
                <div className="funnel-col-title col-right">
                  <div className="funnel-bar col-purple" />
                  RANSAC alignment status <span className="funnel-unit">(consensus)</span>
                </div>
              </div>

              {/* Flow Stage */}
              <div className="funnel-stage" ref={stageRef}>
                <svg className="funnel-svg" aria-hidden="true">
                  <defs>
                    <linearGradient id="funnel-grad-emerald-blue" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.65" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0.65" />
                    </linearGradient>
                    <linearGradient id="funnel-grad-blue-green" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity="0.65" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.65" />
                    </linearGradient>
                  </defs>

                  <g>
                    {ribbonPaths.map((ribbon) => {
                      const isDimmed =
                        (hoveredNode && !ribbon.fromId.includes(hoveredNode) && !ribbon.toId.includes(hoveredNode)) ||
                        (hoveredLink && ribbon.id !== hoveredLink);
                      const isHighlighted =
                        (hoveredNode && (ribbon.fromId.includes(hoveredNode) || ribbon.toId.includes(hoveredNode))) ||
                        (hoveredLink && ribbon.id === hoveredLink);

                      return (
                        <path
                          key={ribbon.id}
                          d={ribbon.d}
                          fill={ribbon.color}
                          className={`funnel-ribbon-path ${isDimmed ? "dimmed" : ""} ${isHighlighted ? "highlighted" : ""}`}
                          onMouseEnter={(e) => {
                            setHoveredLink(ribbon.id);
                            handleMouseMove(e, ribbon.label);
                          }}
                          onMouseMove={(e) => handleMouseMove(e, ribbon.label)}
                          onMouseLeave={handleMouseLeave}
                        />
                      );
                    })}
                  </g>
                </svg>

                {/* Col 1: Frames */}
                <div className="funnel-col col-left">
                  {stats.frames.map((frame) => (
                    <div
                      key={frame.index}
                      id={`node-frame-${frame.index}`}
                      className="funnel-pill"
                      onMouseEnter={() => setHoveredNode(`node-frame-${frame.index}`)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <span className="funnel-pill-name">
                        {frame.fileName} {frame.isAnchor ? <b className="funnel-anchor-tag">(Anchor)</b> : null}
                      </span>
                      <span className="funnel-pill-count">{frame.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* Col 2: Filter Outcomes */}
                <div className="funnel-col col-middle">
                  <div className="funnel-middle-node-wrap">
                    <span className="funnel-count-badge">{stats.totalRatioPassed.toLocaleString()}</span>
                    <div
                      id="node-ratio-pass"
                      className="funnel-pill"
                      onMouseEnter={() => setHoveredNode("node-ratio-pass")}
                      onMouseLeave={handleMouseLeave}
                    >
                      <span className="funnel-icon">↗</span>
                      <span>Passed Lowe's Ratio (≤ 0.75)</span>
                    </div>
                  </div>

                  <div className="funnel-middle-node-wrap">
                    <span className="funnel-count-badge">{stats.totalDiscarded.toLocaleString()}</span>
                    <div
                      id="node-discarded"
                      className="funnel-pill"
                      onMouseEnter={() => setHoveredNode("node-discarded")}
                      onMouseLeave={handleMouseLeave}
                    >
                      <span className="funnel-icon">↘</span>
                      <span>Ambiguous / Discarded (&gt; 0.75)</span>
                    </div>
                  </div>
                </div>

                {/* Col 3: RANSAC Outcome */}
                <div className="funnel-col col-right">
                  <div
                    id="node-inliers"
                    className="funnel-pill"
                    onMouseEnter={() => setHoveredNode("node-inliers")}
                    onMouseLeave={handleMouseLeave}
                  >
                    <span className="funnel-status-circle green">✓</span>
                    <span>RANSAC Inliers</span>
                    <span className="funnel-pill-count">{stats.totalInliers.toLocaleString()}</span>
                  </div>

                  <div
                    id="node-anchor"
                    className="funnel-pill"
                    onMouseEnter={() => setHoveredNode("node-anchor")}
                    onMouseLeave={handleMouseLeave}
                  >
                    <span className="funnel-status-circle dark">⚓</span>
                    <span>Reference Anchor</span>
                    <span className="funnel-pill-count">1</span>
                  </div>

                  <div
                    id="node-outliers"
                    className="funnel-pill"
                    onMouseEnter={() => setHoveredNode("node-outliers")}
                    onMouseLeave={handleMouseLeave}
                  >
                    <span className="funnel-status-circle orange">✕</span>
                    <span>Outliers Filtered</span>
                    <span className="funnel-pill-count">{stats.totalOutliers.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Bottom Diagnostic Metrics */}
          <div className="funnel-footer-metrics">
            <div className="funnel-footer-label">
              ⚡ <strong>Pipeline Consensus:</strong> {diagnostics.image_count} frames aligned into a {diagnostics.output_width} × {diagnostics.output_height} px panorama.
            </div>
            <div className="funnel-metrics-items">
              <div className="funnel-metric">
                <span className="m-lbl">Total Keypoints</span>
                <span className="m-val">{stats.totalKeypoints.toLocaleString()}</span>
              </div>
              <div className="funnel-metric">
                <span className="m-lbl">Ratio-Passed</span>
                <span className="m-val blue">{stats.totalRatioPassed.toLocaleString()}</span>
              </div>
              <div className="funnel-metric">
                <span className="m-lbl">Mean Inlier Ratio</span>
                <span className="m-val green">{(stats.inlierRatioAvg * 100).toFixed(1)}%</span>
              </div>
              <div className="funnel-metric">
                <span className="m-lbl">Reproj. Error</span>
                <span className="m-val">{stats.meanReprojError.toFixed(2)} px</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="funnel-empty-state">
          <p>Filled in after a successful stitch run.</p>
        </div>
      )}

      {/* Table View Modal */}
      {showTableModal && (
        <div
          className="funnel-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTableModal(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="funnel-modal-content">
            <div className="funnel-modal-header">
              <h4>Feature Triage &amp; Alignment Metrics</h4>
              <button
                type="button"
                className="funnel-modal-close"
                onClick={() => setShowTableModal(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>
            {diagnostics ? (
              <div className="tablewrap">
                <table className="funnel-table">
                  <thead>
                    <tr>
                      <th>Frame</th>
                      <th className="r">Raw Keypoints</th>
                      <th className="r">Ratio Pass</th>
                      <th className="r">Inliers</th>
                      <th className="r">Inlier Ratio</th>
                      <th className="r">Reproj. Error</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.frames.map((frame, idx) => {
                      const passCount = diagnostics.ratio_passed_matches_per_pair[idx] ?? "-";
                      const inlierCount = diagnostics.inliers_per_pair[idx] ?? "-";
                      const inlierRatio = diagnostics.inlier_ratio_per_pair[idx]
                        ? `${(diagnostics.inlier_ratio_per_pair[idx] * 100).toFixed(1)}%`
                        : "-";
                      const reproj = diagnostics.reprojection_error_per_pair[idx]
                        ? `${diagnostics.reprojection_error_per_pair[idx].toFixed(2)} px`
                        : "-";

                      return (
                        <tr key={frame.index}>
                          <td>
                            <strong>{frame.fileName}</strong>
                            {frame.isAnchor && <span className="funnel-tag-anchor">Anchor</span>}
                          </td>
                          <td className="r">{frame.count.toLocaleString()}</td>
                          <td className="r">{passCount.toLocaleString()}</td>
                          <td className="r">{inlierCount.toLocaleString()}</td>
                          <td className="r">{inlierRatio}</td>
                          <td className="r">{reproj}</td>
                          <td>
                            {frame.isAnchor ? (
                              <span className="status-badge anchor">Anchor Frame</span>
                            ) : (
                              <span className="status-badge aligned">✓ Aligned</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ padding: "20px", color: "var(--muted)" }}>No diagnostics data available.</p>
            )}
          </div>
        </div>
      )}

      {/* Floating Tooltip */}
      {tooltip && (
        <div
          className="funnel-floating-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
