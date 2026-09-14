import { describe, expect, it } from "vitest";

import type { ApiErrorDetail } from "../types";
import { getPartialDiagnostics, getStoppedAtStage } from "./partialDiagnostics";

const validPartial = [
  { pair: [0, 1], pair_index: 0, status: "passed", inlier_count: 101 },
  { pair: [1, 2], pair_index: 1, status: "failed", inlier_count: 9 },
  { pair: [2, 3], pair_index: 2, status: "not_processed" },
];

describe("getPartialDiagnostics", () => {
  it("returns null when there is no context", () => {
    expect(getPartialDiagnostics({ code: "X", message: "x" })).toBeNull();
  });

  it("returns null for null/undefined detail", () => {
    expect(getPartialDiagnostics(null)).toBeNull();
    expect(getPartialDiagnostics(undefined)).toBeNull();
  });

  it("returns the rows when the shape is valid", () => {
    const detail: ApiErrorDetail = {
      code: "INSUFFICIENT_INLIERS",
      message: "x",
      context: { partial_diagnostics: validPartial },
    };
    expect(getPartialDiagnostics(detail)).toEqual(validPartial);
  });

  it("returns null for an empty array rather than rendering an empty table", () => {
    const detail: ApiErrorDetail = {
      code: "INSUFFICIENT_INLIERS",
      message: "x",
      context: { partial_diagnostics: [] },
    };
    expect(getPartialDiagnostics(detail)).toBeNull();
  });

  it("returns null when an entry is missing a required field (a malformed/legacy payload)", () => {
    const detail: ApiErrorDetail = {
      code: "INSUFFICIENT_INLIERS",
      message: "x",
      context: { partial_diagnostics: [{ pair: [0, 1], status: "passed" }] },
    };
    expect(getPartialDiagnostics(detail)).toBeNull();
  });

  it("returns null when partial_diagnostics is not an array", () => {
    const detail: ApiErrorDetail = {
      code: "INSUFFICIENT_INLIERS",
      message: "x",
      context: { partial_diagnostics: "nope" },
    };
    expect(getPartialDiagnostics(detail)).toBeNull();
  });

  it("returns null for an old response that predates this field", () => {
    const detail: ApiErrorDetail = {
      code: "INSUFFICIENT_INLIERS",
      message: "x",
      context: { inliers: 5, required: 12 },
    };
    expect(getPartialDiagnostics(detail)).toBeNull();
  });
});

describe("getStoppedAtStage", () => {
  it("reads a string stage name", () => {
    const detail: ApiErrorDetail = {
      code: "INSUFFICIENT_INLIERS",
      message: "x",
      context: { stopped_at_stage: "homography" },
    };
    expect(getStoppedAtStage(detail)).toBe("homography");
  });

  it("returns null when absent", () => {
    expect(getStoppedAtStage({ code: "X", message: "x" })).toBeNull();
  });
});
