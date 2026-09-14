import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { successWithOverlayFixture } from "../../fixtures";
import type { ApiErrorDetail } from "../../types";
import { Diagnostics } from "./Diagnostics";

const partialFailure: { status: number; detail: ApiErrorDetail } = {
  status: 422,
  detail: {
    code: "INSUFFICIENT_INLIERS",
    message: "Images 2 and 3 do not have enough geometric agreement.",
    context: {
      pair: [1, 2],
      partial_diagnostics: [
        { pair: [0, 1], pair_index: 0, status: "passed", inlier_count: 101, inlier_ratio: 0.69 },
        { pair: [1, 2], pair_index: 1, status: "failed", inlier_count: 9, inlier_ratio: 0.09 },
      ],
    },
  },
};

const noEvidenceFailure: { status: number; detail: ApiErrorDetail } = {
  status: 422,
  detail: { code: "NO_DESCRIPTORS", message: "Image 1 has too little texture for this detector." },
};

describe("Diagnostics", () => {
  it("always renders the heading, even with no result", () => {
    render(<Diagnostics result={null} />);
    expect(screen.getByText("Alignment diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Filled in after a successful run.")).toBeInTheDocument();
  });

  it("switches the lede once a result exists", () => {
    render(<Diagnostics result={successWithOverlayFixture} />);
    expect(
      screen.getByText(
        "Read from the server response. Ratio and error show the worst pair, not an average.",
      ),
    ).toBeInTheDocument();
  });

  it("renders six dashes, the no-pairs row, and the timings placeholder with no result (A15)", () => {
    const { container } = render(<Diagnostics result={null} />);
    expect(container.querySelectorAll(".kpi .v")).toHaveLength(6);
    for (const value of container.querySelectorAll(".kpi .v")) {
      expect(value).toHaveTextContent("—");
    }
    expect(screen.getByText("No accepted pairs yet")).toBeInTheDocument();
    expect(screen.getByText("Timings arrive with the response")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d/);
  });

  it("renders the summary cards, the per-pair table, and the stage chart together with a result", () => {
    render(<Diagnostics result={successWithOverlayFixture} />);
    expect(screen.getByText("Keypoints")).toBeInTheDocument();
    expect(screen.getByText("Per-pair geometry")).toBeInTheDocument();
    expect(screen.getByText(/ms total/)).toBeInTheDocument();
  });

  it("renders the failed run's partial per-pair evidence instead of the empty placeholder", () => {
    render(<Diagnostics result={null} error={partialFailure} />);
    expect(screen.getByText(/run stopped before finishing/i)).toBeInTheDocument();
    expect(screen.getByText("accepted")).toBeInTheDocument();
    expect(screen.getByText("rejected")).toBeInTheDocument();
    expect(screen.queryByText("No accepted pairs yet")).not.toBeInTheDocument();
  });

  it("still shows the empty placeholder for a failure with no partial diagnostics", () => {
    render(<Diagnostics result={null} error={noEvidenceFailure} />);
    expect(screen.getByText("No accepted pairs yet")).toBeInTheDocument();
    expect(screen.getByText("Filled in after a successful run.")).toBeInTheDocument();
  });

  it("shows no stale numbers from a prior successful run once that run is replaced by a failure", () => {
    const { rerender } = render(<Diagnostics result={successWithOverlayFixture} />);
    expect(screen.getByText("Keypoints")).toBeInTheDocument();

    rerender(<Diagnostics result={null} error={partialFailure} />);

    // The six KPI cells reset to "—"; none of the previous run's numbers
    // (keypoint/match/inlier totals) survive into the failed render.
    const kpiValues = document.querySelectorAll(".kpi .v");
    expect(kpiValues).toHaveLength(6);
    for (const value of kpiValues) {
      expect(value).toHaveTextContent("—");
    }
    expect(screen.getByText("rejected")).toBeInTheDocument();
  });
});
