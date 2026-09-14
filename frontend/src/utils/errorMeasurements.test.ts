import { describe, expect, it } from "vitest";

import type { ApiErrorDetail } from "../types";
import { measurementsForError } from "./errorMeasurements";

describe("measurementsForError", () => {
  it("returns [] for a response with no context", () => {
    expect(measurementsForError({ code: "INSUFFICIENT_INLIERS", message: "x" })).toEqual([]);
  });

  it("returns [] for null/undefined detail", () => {
    expect(measurementsForError(null)).toEqual([]);
    expect(measurementsForError(undefined)).toEqual([]);
  });

  it("returns [] for a code it does not recognise", () => {
    const detail: ApiErrorDetail = {
      code: "EXOTIC_FAILURE_MODE",
      message: "x",
      context: { anything: 1 },
    };
    expect(measurementsForError(detail)).toEqual([]);
  });

  it("reports only the inlier-count row when only the count bar missed", () => {
    const detail: ApiErrorDetail = {
      code: "INSUFFICIENT_INLIERS",
      message: "x",
      context: {
        inlier_count: 4,
        min_inliers: 12,
        inlier_ratio: 1.0,
        min_inlier_ratio: 0.25,
        failed_checks: ["min_inliers"],
      },
    };
    const rows = measurementsForError(detail);
    expect(rows).toHaveLength(2);
    const inliers = rows.find((row) => row.label === "Inliers");
    expect(inliers).toMatchObject({ measured: "4", threshold: "at least 12", passed: false });
    const ratio = rows.find((row) => row.label === "Inlier ratio");
    expect(ratio).toMatchObject({ measured: "100%", threshold: "at least 25%", passed: true });
  });

  it("reports both rows as failing when both bars missed", () => {
    const detail: ApiErrorDetail = {
      code: "INSUFFICIENT_INLIERS",
      message: "x",
      context: {
        inlier_count: 9,
        min_inliers: 12,
        inlier_ratio: 0.093,
        min_inlier_ratio: 0.25,
        failed_checks: ["min_inliers", "min_inlier_ratio"],
      },
    };
    const rows = measurementsForError(detail);
    expect(rows.every((row) => !row.passed)).toBe(true);
    expect(rows.find((row) => row.label === "Inlier ratio")?.measured).toBe("9%");
  });

  it("falls back to legacy `inliers`/`required` field names", () => {
    const detail: ApiErrorDetail = {
      code: "INSUFFICIENT_INLIERS",
      message: "x",
      context: { inliers: 5, required: 12 },
    };
    const rows = measurementsForError(detail);
    expect(rows).toEqual([
      { label: "Inliers", measured: "5", threshold: "at least 12", passed: false },
    ]);
  });

  it("reports a px reprojection-error row plus the already-cleared inlier count", () => {
    const detail: ApiErrorDetail = {
      code: "EXCESSIVE_REPROJECTION_ERROR",
      message: "x",
      context: {
        reprojection_error: 4.2,
        max_reprojection_error: 3.0,
        inlier_count: 38,
        inlier_ratio: 0.95,
      },
    };
    const rows = measurementsForError(detail);
    expect(rows).toEqual([
      { label: "Reprojection error", measured: "4.20 px", threshold: "at most 3.00 px", passed: false },
      { label: "Inliers", measured: "38", threshold: "already cleared", passed: true },
    ]);
  });

  it("reports the ratio-passed-matches row for INSUFFICIENT_MATCHES", () => {
    const detail: ApiErrorDetail = {
      code: "INSUFFICIENT_MATCHES",
      message: "x",
      context: { matches: 6, min_matches: 20 },
    };
    expect(measurementsForError(detail)).toEqual([
      { label: "Ratio-passed matches", measured: "6", threshold: "at least 20", passed: false },
    ]);
  });

  it("reports the canvas-size row in megapixels for CANVAS_TOO_LARGE", () => {
    const detail: ApiErrorDetail = {
      code: "CANVAS_TOO_LARGE",
      message: "x",
      context: { pixels: 12_000_000, limit: 8_000_000, width: 4000, height: 3000 },
    };
    expect(measurementsForError(detail)).toEqual([
      { label: "Combined canvas", measured: "12.0 MP", threshold: "at most 8.0 MP", passed: false },
    ]);
  });

  it("delegates to the preserved cause for DISCONNECTED_IMAGES", () => {
    const detail: ApiErrorDetail = {
      code: "DISCONNECTED_IMAGES",
      message: "x",
      context: {
        image: 2,
        cause: {
          code: "INSUFFICIENT_INLIERS",
          message: "y",
          context: { inlier_count: 5, min_inliers: 12 },
        },
      },
    };
    expect(measurementsForError(detail)).toEqual([
      { label: "Inliers", measured: "5", threshold: "at least 12", passed: false },
    ]);
  });

  it("returns [] for DISCONNECTED_IMAGES with no cause (an old response)", () => {
    const detail: ApiErrorDetail = { code: "DISCONNECTED_IMAGES", message: "x", context: { image: 2 } };
    expect(measurementsForError(detail)).toEqual([]);
  });
});
