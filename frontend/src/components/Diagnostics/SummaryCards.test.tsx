import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { successWithOverlayFixture } from "../../fixtures";
import { SummaryCards } from "./SummaryCards";

describe("SummaryCards", () => {
  it("shows the minimum inlier ratio and maximum reprojection error, not an average (A4)", () => {
    const { diagnostics } = successWithOverlayFixture;
    // inlier_ratio_per_pair: [0.69, 0.68] -> min 0.68; average would be 0.685
    // reprojection_error_per_pair: [1.42, 1.88] -> max 1.88; average would be 1.65
    render(<SummaryCards diagnostics={diagnostics} mimeType="image/png" />);

    expect(screen.getByText("0.68")).toBeInTheDocument();
    expect(screen.queryByText("0.69")).not.toBeInTheDocument();
    expect(screen.queryByText("0.69 / 0.68")).not.toBeInTheDocument();

    expect(screen.getByText("1.88 px")).toBeInTheDocument();
    expect(screen.queryByText("1.65 px")).not.toBeInTheDocument();
  });

  it("sums keypoints and lists the per-image counts", () => {
    render(<SummaryCards diagnostics={successWithOverlayFixture.diagnostics} mimeType="image/png" />);
    // 812 + 765 + 930 = 2507
    expect(screen.getByText("2,507")).toBeInTheDocument();
    expect(screen.getByText("812 / 765 / 930")).toBeInTheDocument();
  });

  it("computes the output card's megapixels from width and height", () => {
    render(<SummaryCards diagnostics={successWithOverlayFixture.diagnostics} mimeType="image/png" />);
    // 3840 * 1380 = 5,299,200 -> 5.30 MP
    expect(screen.getByText(/5\.30 MP · image\/png/)).toBeInTheDocument();
  });
});
