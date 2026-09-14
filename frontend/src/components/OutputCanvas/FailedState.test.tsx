import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ApiErrorDetail } from "../../types";
import { FailedState } from "./FailedState";

describe("FailedState", () => {
  it("renders measured-value-vs-threshold rows with percent and px units", () => {
    const detail: ApiErrorDetail = {
      code: "INSUFFICIENT_INLIERS",
      message: "Images 2 and 3 do not have enough geometric agreement.",
      context: {
        pair: [1, 2],
        inlier_count: 9,
        min_inliers: 12,
        inlier_ratio: 0.093,
        min_inlier_ratio: 0.25,
        failed_checks: ["min_inliers", "min_inlier_ratio"],
      },
    };
    render(<FailedState status={422} detail={detail} />);
    expect(screen.getByText("Inliers")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("at least 12")).toBeInTheDocument();
    expect(screen.getByText("Inlier ratio")).toBeInTheDocument();
    expect(screen.getByText("9%")).toBeInTheDocument();
  });

  it("never renders the nested cause object or partial_diagnostics array as a raw chip", () => {
    const detail: ApiErrorDetail = {
      code: "DISCONNECTED_IMAGES",
      message: "Image 3 could not be linked to the others: y",
      context: {
        image: 2,
        cause: { code: "INSUFFICIENT_INLIERS", message: "y", context: { pair: [1, 2] } },
        partial_diagnostics: [{ pair: [0, 1], pair_index: 0, status: "passed" }],
        stopped_at_stage: "homography",
      },
    };
    render(<FailedState status={422} detail={detail} />);
    expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
  });

  it("humanizes chip labels instead of showing a raw underscored field name as the description", () => {
    const detail: ApiErrorDetail = {
      code: "INSUFFICIENT_INLIERS",
      message: "x",
      context: { min_inlier_ratio: 0.25 },
    };
    render(<FailedState status={422} detail={detail} />);
    expect(screen.getByText(/min inlier ratio/)).toBeInTheDocument();
  });

  it("renders no measurement list and no chips for a response with no context, without crashing", () => {
    const detail: ApiErrorDetail = { code: "SERVICE_BUSY", message: "The service is busy." };
    const { container } = render(<FailedState status={503} detail={detail} />);
    expect(container.querySelector(".measurelist")).toBeNull();
    expect(container.querySelector(".chips")).toBeNull();
    expect(screen.getByText("The service is busy.")).toBeInTheDocument();
  });

  it("still renders the generic remedy and no measurement list for an unrecognised code", () => {
    const detail: ApiErrorDetail = {
      code: "EXOTIC_FAILURE_MODE",
      message: "The pipeline returned an error the frontend does not recognise.",
    };
    const { container } = render(<FailedState status={422} detail={detail} />);
    expect(container.querySelector(".measurelist")).toBeNull();
    expect(screen.getByText(/try different photos or fewer frames/i)).toBeInTheDocument();
  });

  it("still renders correctly for a legacy response using pre-split field names", () => {
    const detail: ApiErrorDetail = {
      code: "INSUFFICIENT_INLIERS",
      message: "Images 1 and 2 do not have enough geometric agreement.",
      context: { pair: [0, 1], pair_index: 0, inliers: 5, required: 12, inlier_ratio: 0.18 },
    };
    render(<FailedState status={422} detail={detail} />);
    expect(screen.getByText("Inliers")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("at least 12")).toBeInTheDocument();
  });
});
