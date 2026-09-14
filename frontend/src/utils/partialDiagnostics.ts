import type { ApiErrorDetail, PairDiagnostic } from "../types";

const STATUSES = new Set(["passed", "failed", "not_processed"]);

/**
 * Runtime shape guard for `context.partial_diagnostics` (docs/backend-spec.md
 * section 9.2). `context` is typed `unknown` precisely because it varies by
 * code, an old response predates this field, and an error the client has
 * never seen must still render (docs/integration-spec.md): this validates
 * the minimum shape a row needs before it is trusted, rather than casting.
 */
function isPairDiagnostic(value: unknown): value is PairDiagnostic {
  if (value === null || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    Array.isArray(row.pair) &&
    row.pair.length === 2 &&
    row.pair.every((index) => typeof index === "number") &&
    typeof row.pair_index === "number" &&
    typeof row.status === "string" &&
    STATUSES.has(row.status)
  );
}

/** Returns `null` when the run succeeded or carries nothing usable, never a stale list. */
export function getPartialDiagnostics(
  detail: ApiErrorDetail | null | undefined,
): PairDiagnostic[] | null {
  const value = detail?.context?.partial_diagnostics;
  if (!Array.isArray(value) || value.length === 0) return null;
  return value.every(isPairDiagnostic) ? (value as PairDiagnostic[]) : null;
}

export function getStoppedAtStage(detail: ApiErrorDetail | null | undefined): string | null {
  const value = detail?.context?.stopped_at_stage;
  return typeof value === "string" ? value : null;
}
