import { headingForError, remedyForCode } from "../../constants/remedies";
import { FALLBACK_CONFIG } from "../../constants/config";
import type { ApiErrorDetail, ClientConfig } from "../../types";

export interface FailedStateProps {
  status: number;
  detail: ApiErrorDetail;
  config?: ClientConfig;
  files?: readonly { name: string }[];
}

/**
 * `image` and `pair` are the backend's zero-based indices
 * (docs/backend-spec.md section 9); every other context field is already a
 * measurement and renders as sent (docs/integration-spec.md section 7.1).
 */
function contextChipValue(key: string, value: string | number | number[]): string {
  if (key === "image" && typeof value === "number") return String(value + 1);
  if (key === "pair" && Array.isArray(value)) return value.map((index) => index + 1).join(", ");
  return Array.isArray(value) ? value.join(", ") : String(value);
}

/**
 * docs/ui-spec.md section 7: a card rendering five things in order — the
 * status/code eyebrow, the heading, the backend message, context chips
 * (omitted when absent), and the remedy list. Chip and remedy logic is
 * unchanged from v1; only the card layout and the eyebrow-first order move.
 */
export function FailedState({
  status,
  detail,
  config = FALLBACK_CONFIG,
  files = [],
}: FailedStateProps) {
  const heading = headingForError(detail, files);
  const remedies = remedyForCode(detail, config);
  const context = detail.context;

  return (
    <div className="failcard" role="alert">
      <span className="code">{status > 0 ? `${status} · ${detail.code}` : detail.code}</span>
      <h3>{heading}</h3>
      <p>{detail.message}</p>
      {context && (
        <div className="chips">
          {Object.entries(context).map(([key, value]) => (
            <span className="chip" key={key}>
              {key} {contextChipValue(key, value)}
            </span>
          ))}
        </div>
      )}
      <ul>
        {remedies.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
