import { headingForError, remedyForCode } from "../../constants/remedies";
import { FALLBACK_CONFIG } from "../../constants/config";
import type { ApiErrorDetail, ClientConfig } from "../../types";
import { measurementsForError } from "../../utils/errorMeasurements";

export interface FailedStateProps {
  status: number;
  detail: ApiErrorDetail;
  config?: ClientConfig;
  files?: readonly { name: string }[];
}

type ChipScalar = string | number | boolean;

function isChipScalar(value: unknown): value is ChipScalar {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

/**
 * `image` and `pair` are the backend's zero-based indices
 * (docs/backend-spec.md section 9); every other scalar context field is
 * already a measurement and renders as sent (docs/integration-spec.md
 * section 7.1). This is the technical-detail row, kept for inspection --
 * `measurementsForError` above it is the primary, human-phrased fact list,
 * so a raw key like `min_inlier_ratio` here is a label, not the main
 * explanation.
 */
function contextChipValue(key: string, value: ChipScalar | ChipScalar[]): string {
  if (key === "image" && typeof value === "number") return String(value + 1);
  if (key === "pair" && Array.isArray(value)) return value.map((index) => Number(index) + 1).join(", ");
  return Array.isArray(value) ? value.join(", ") : String(value);
}

function humanizeKey(key: string): string {
  return key.replace(/_/g, " ");
}

/**
 * Only plain scalars and arrays of scalars render as chips. `cause` (a
 * nested object) and `partial_diagnostics` (an array of objects) carry
 * their own dedicated rendering elsewhere, so `String(value)` never turns
 * one into a useless `[object Object]` chip.
 */
function scalarContextEntries(
  context: Record<string, unknown> | undefined,
): Array<[string, ChipScalar | ChipScalar[]]> {
  if (!context) return [];
  return Object.entries(context).filter(
    (entry): entry is [string, ChipScalar | ChipScalar[]] => {
      const value = entry[1];
      return isChipScalar(value) || (Array.isArray(value) && value.every(isChipScalar));
    },
  );
}

/**
 * docs/ui-spec.md section 7: a card rendering six things in order — the
 * status/code eyebrow, the heading, the backend message, the measured-value-
 * vs-threshold facts (omitted when the code carries none), context chips
 * (omitted when none remain after filtering), and the remedy list.
 */
export function FailedState({
  status,
  detail,
  config = FALLBACK_CONFIG,
  files = [],
}: FailedStateProps) {
  const heading = headingForError(detail, files);
  const remedies = remedyForCode(detail, config);
  const measurements = measurementsForError(detail);
  const chipEntries = scalarContextEntries(detail.context);

  return (
    <div className="failcard" role="alert">
      <span className="code">{status > 0 ? `${status} · ${detail.code}` : detail.code}</span>
      <h3>{heading}</h3>
      <p>{detail.message}</p>
      {measurements.length > 0 && (
        <ul className="measurelist">
          {measurements.map((measurement) => (
            <li key={measurement.label} className={measurement.passed ? "ok" : "bad"}>
              <span className="m-label">{measurement.label}</span>
              <span className="m-value">{measurement.measured}</span>
              <span className="m-threshold">{measurement.threshold}</span>
            </li>
          ))}
        </ul>
      )}
      {chipEntries.length > 0 && (
        <div className="chips">
          {chipEntries.map(([key, value]) => (
            <span className="chip" key={key}>
              {humanizeKey(key)} {contextChipValue(key, value)}
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
