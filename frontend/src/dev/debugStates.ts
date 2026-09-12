/**
 * The switcher's own state list. docs/ui-spec.md section 4 defines five
 * exclusive screen states; the six counted in section 1 and section 12
 * (A1) add the cold-start notice as a distinguishable variant of `working`
 * (section 5/9), not a sixth value of the state machine itself. The
 * switcher exposes all six renderings for review and screenshots.
 */
export type DebugStateKey =
  | "empty"
  | "ready"
  | "working"
  | "working-cold-start"
  | "complete"
  | "failed";

export interface DebugStateEntry {
  key: DebugStateKey;
  label: string;
}

export const DEBUG_STATES: readonly DebugStateEntry[] = [
  { key: "empty", label: "Empty" },
  { key: "ready", label: "Frames loaded" },
  { key: "working", label: "Stitching" },
  { key: "working-cold-start", label: "Stitching (cold start)" },
  { key: "complete", label: "Complete" },
  { key: "failed", label: "Rejected" },
];
