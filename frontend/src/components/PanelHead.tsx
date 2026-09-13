import type { ReactNode } from "react";

export interface PanelHeadProps {
  /** The panel's position among the numbered regions of the mock (section 3.1). */
  index: number;
  title: string;
  /** A single faint label pushed to the right, e.g. "n / max" or "{k} pairs · all accepted". */
  aside?: ReactNode;
  /** Additional trailing content after the aside, e.g. the stage head's chips and tools. */
  children?: ReactNode;
}

/**
 * docs/ui-spec.md section 3.1: every panel is named by an index badge and a
 * sentence-case title, replacing the v1 kicker + h2 pair. Used by the
 * control rail, output stage, and diagnostics panels.
 *
 * Groups the badge+title and the aside+children into the same two flex
 * children `.panel-head`'s current (and v1) layout already expects, so this
 * component drops into the existing `.panel-head` rule without requiring
 * every panel it's used in to migrate in the same slice.
 */
export function PanelHead({ index, title, aside, children }: PanelHeadProps) {
  const hasTrail = aside !== undefined && aside !== null;
  return (
    <div className="panel-head">
      <div className="panel-head-title">
        <span className="idx">{index}</span>
        <h2>{title}</h2>
      </div>
      {(hasTrail || children) && (
        <div className="panel-head-trail">
          {hasTrail && <span className="aside">{aside}</span>}
          {children}
        </div>
      )}
    </div>
  );
}
