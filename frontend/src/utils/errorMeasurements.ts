import type { ApiErrorDetail } from "../types";

/**
 * One value-vs-threshold fact for the failed state (docs/backend-spec.md
 * section 9's `context` carries the measurement that failed): the exact
 * number the pipeline measured, the bar it was checked against, and whether
 * it cleared that bar. `passed` lets a code list an informational
 * measurement (one that already cleared its own bar) alongside the one that
 * did not, e.g. inlier count next to a reprojection-error rejection.
 */
export interface Measurement {
  label: string;
  measured: string;
  threshold: string;
  passed: boolean;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstFiniteNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const number = asFiniteNumber(value);
    if (number !== null) return number;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function px(value: number): string {
  return `${value.toFixed(2)} px`;
}

function megapixels(value: number): string {
  return `${(value / 1_000_000).toFixed(1)} MP`;
}

/**
 * Structured measurements for the codes that carry a measurable gate.
 * Defensive by construction: every field is read with a legacy-name
 * fallback (an older response used `inliers`/`required` before this field
 * was split into several), and a code or shape this function does not
 * recognise returns `[]` rather than throwing (docs/integration-spec.md:
 * an old response, a partial context, or an unrecognised code must never
 * break the UI).
 */
export function measurementsForError(detail: ApiErrorDetail | null | undefined): Measurement[] {
  const context = detail?.context;
  if (!detail || !context) return [];

  switch (detail.code) {
    case "INSUFFICIENT_MATCHES": {
      const matches = firstFiniteNumber(context.matches);
      const minMatches = firstFiniteNumber(context.min_matches, context.required);
      if (matches === null || minMatches === null) return [];
      return [
        {
          label: "Ratio-passed matches",
          measured: String(matches),
          threshold: `at least ${minMatches}`,
          passed: matches >= minMatches,
        },
      ];
    }

    case "INSUFFICIENT_INLIERS": {
      const rows: Measurement[] = [];
      const inlierCount = firstFiniteNumber(context.inlier_count, context.inliers);
      const minInliers = firstFiniteNumber(context.min_inliers, context.required);
      if (inlierCount !== null && minInliers !== null) {
        rows.push({
          label: "Inliers",
          measured: String(inlierCount),
          threshold: `at least ${minInliers}`,
          passed: inlierCount >= minInliers,
        });
      }
      const inlierRatio = firstFiniteNumber(context.inlier_ratio);
      const minInlierRatio = firstFiniteNumber(context.min_inlier_ratio);
      if (inlierRatio !== null && minInlierRatio !== null) {
        rows.push({
          label: "Inlier ratio",
          measured: pct(inlierRatio),
          threshold: `at least ${pct(minInlierRatio)}`,
          passed: inlierRatio >= minInlierRatio,
        });
      }
      return rows;
    }

    case "EXCESSIVE_REPROJECTION_ERROR": {
      const rows: Measurement[] = [];
      const reprojectionError = firstFiniteNumber(context.reprojection_error);
      const maxReprojectionError = firstFiniteNumber(context.max_reprojection_error);
      if (reprojectionError !== null && maxReprojectionError !== null) {
        rows.push({
          label: "Reprojection error",
          measured: px(reprojectionError),
          threshold: `at most ${px(maxReprojectionError)}`,
          passed: reprojectionError <= maxReprojectionError,
        });
      }
      const inlierCount = firstFiniteNumber(context.inlier_count);
      if (inlierCount !== null) {
        rows.push({
          label: "Inliers",
          measured: String(inlierCount),
          threshold: "already cleared",
          passed: true,
        });
      }
      return rows;
    }

    case "CANVAS_TOO_LARGE": {
      const pixels = firstFiniteNumber(context.pixels);
      const limit = firstFiniteNumber(context.limit);
      if (pixels === null || limit === null) return [];
      return [
        {
          label: "Combined canvas",
          measured: megapixels(pixels),
          threshold: `at most ${megapixels(limit)}`,
          passed: pixels <= limit,
        },
      ];
    }

    case "DISCONNECTED_IMAGES": {
      const cause = asRecord(context.cause);
      if (!cause) return [];
      return measurementsForError({
        code: typeof cause.code === "string" ? cause.code : "",
        message: "",
        context: asRecord(cause.context),
      });
    }

    default:
      return [];
  }
}
