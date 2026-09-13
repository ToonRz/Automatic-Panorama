import { DEBUG_STATES, type DebugStateKey } from "./debugStates";

export interface StateSwitcherProps {
  current: DebugStateKey | null;
  onSelect: (state: DebugStateKey) => void;
}

/**
 * Dev-only. Mounted by App only when `VITE_MOCK_API === "true"`
 * (docs/ui-spec.md section 10) so it never reaches the production build.
 * docs/ui-spec.md section 3: a floating bar at the bottom of the viewport.
 */
export function StateSwitcher({ current, onSelect }: StateSwitcherProps) {
  return (
    <div className="mockbar" role="toolbar" aria-label="Mock controls">
      <span className="tag">MOCK</span>
      <div className="grp" role="group" aria-label="Mock state">
        {DEBUG_STATES.map((entry) => (
          <button
            key={entry.key}
            type="button"
            aria-pressed={entry.key === current}
            onClick={() => onSelect(entry.key)}
          >
            {entry.label}
          </button>
        ))}
      </div>
    </div>
  );
}
