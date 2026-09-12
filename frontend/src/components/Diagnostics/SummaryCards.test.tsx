import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { successWithOverlayFixture } from "../../fixtures";
import { SummaryCards } from "./SummaryCards";

describe("SummaryCards", () => {
  it("shows the minimum inlier ratio and maximum reprojection error, not an average (A4)", () => {
    const { diagnostics } = successWithOverlayFixture;
    render(<SummaryCards diagnostics={diagnostics} mimeType="image/png" />);

    expect(screen.getByText("0.87")).toBeInTheDocument();
    expect(screen.queryByText("0.91")).not.toBeInTheDocument();
    expect(screen.getByText("0.09 px")).toBeInTheDocument();
  });

  it("sums keypoints and lists the per-image counts", () => {
    render(<SummaryCards diagnostics={successWithOverlayFixture.diagnostics} mimeType="image/png" />);
    expect(screen.getByText("5,566")).toBeInTheDocument();
    expect(screen.getByText("1566 / 2000 / 2000")).toBeInTheDocument();
  });

  it("computes the output card's megapixels from width and height", () => {
    render(<SummaryCards diagnostics={successWithOverlayFixture.diagnostics} mimeType="image/png" />);
    expect(screen.getByText(/0\.85 MP · image\/png/)).toBeInTheDocument();
  });
});
