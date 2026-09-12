import { headingForError, remedyForCode } from "../../constants/remedies";
import type { ApiErrorDetail } from "../../types";

export interface FailedStateProps {
  status: number;
  detail: ApiErrorDetail;
}

/**
 * docs/ui-spec.md section 7: heading, HTTP status + code in mono, the
 * backend message, then context chips (omitted when context is absent).
 */
export function FailedState({ status, detail }: FailedStateProps) {
  const heading = headingForError(detail);
  const remedies = remedyForCode(detail.code);
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
                <b>{Array.isArray(value) ? value.join(", ") : String(value)}</b>
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
