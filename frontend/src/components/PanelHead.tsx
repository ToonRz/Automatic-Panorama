import type { ReactNode } from "react";

export interface PanelHeadProps {
  /** The panel's position among the numbered regions of the mock (section 3.1). */
  index: number;
  title: string;
  /** A single faint label pushed to the panel head's right edge, e.g. "n / max". */
  aside?: ReactNode;
  /**
   * Additional content after the title, in normal flow (e.g. the stage
   * head's chips). Give any part of it its own `margin-left: auto` (as the
   * stage's `.tools` class does) to push it to the right edge instead.
   */
  children?: ReactNode;
}

/**
 * docs/ui-spec.md section 3.1: every panel is named by an index badge and a
 * sentence-case title, replacing the v1 kicker + h2 pair. Used by the
 * control rail, output stage, and diagnostics panels.
 */
export function PanelHead({ index, title, aside, children }: PanelHeadProps) {
  return (
    <div className="panel-head">
      <div className="panel-head-title">
        <span className="idx">{index}</span>
        <h2>{title}</h2>
      </div>
      {aside !== undefined && aside !== null && <span className="aside">{aside}</span>}
      {children}
    </div>
  );
}
