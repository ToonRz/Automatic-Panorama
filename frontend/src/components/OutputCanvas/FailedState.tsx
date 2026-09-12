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
 * docs/ui-spec.md section 7: heading, HTTP status + code in mono, the
 * backend message, then context chips (omitted when context is absent).
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
    <div>
      <div className="alert" role="alert">
        <h3>{heading}</h3>
        <code>{status > 0 ? `${status} · ${detail.code}` : detail.code}</code>
        <p>{detail.message}</p>
        {context && (
          <div className="ctx">
            {Object.entries(context).map(([key, value]) => (
              <span key={key}>
                {key}
                <b>{contextChipValue(key, value)}</b>
              </span>
            ))}
          </div>
        )}
      </div>
      <ul className="remedy">
        {remedies.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
