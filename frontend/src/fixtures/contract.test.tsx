import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { Diagnostics } from "../components/Diagnostics/Diagnostics";
import { FailedState } from "../components/OutputCanvas/FailedState";
import { insufficientInliersError, successWithOverlayFixture } from "./index";
import configSnapshot from "./contract/config.json";
import insufficientSnapshot from "./contract/error-insufficient-inliers.json";
import tooFewSnapshot from "./contract/error-too-few-images.json";
import successSnapshot from "./contract/stitch-success.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isErrorEnvelope(value: unknown): boolean {
  return (
    isRecord(value) &&
    isRecord(value.detail) &&
    typeof value.detail.code === "string" &&
    typeof value.detail.message === "string"
  );
}

function isConfig(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.max_upload_files === "number" &&
    typeof value.max_upload_mb === "number" &&
    typeof value.max_total_upload_mb === "number" &&
    (value.default_detector === "SIFT" || value.default_detector === "ORB") &&
    isRecord(value.max_input_long_edge_by_count)
  );
}

function isStitchResponse(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.status === "complete" &&
    isRecord(value.image) &&
    typeof value.image.data_url === "string" &&
    isRecord(value.diagnostics) &&
    isRecord(value.diagnostics.stage_timings_ms) &&
    Array.isArray(value.diagnostics.image_order)
  );
}

describe("committed API contract snapshots", () => {
  it("match the runtime shapes used by types.ts", () => {
    expect(isConfig(configSnapshot)).toBe(true);
    expect(isStitchResponse(successSnapshot)).toBe(true);
    expect(isErrorEnvelope(tooFewSnapshot)).toBe(true);
    expect(isErrorEnvelope(insufficientSnapshot)).toBe(true);
  });

  it("renders complete and failed states from the snapshots", () => {
    const { unmount } = render(createElement(Diagnostics, { result: successWithOverlayFixture }));
    expect(screen.getByText(/stage timings/i)).toBeInTheDocument();
    unmount();

    render(createElement(FailedState, insufficientInliersError));
    expect(screen.getByRole("alert")).toHaveTextContent("INSUFFICIENT_INLIERS");
  });
});
