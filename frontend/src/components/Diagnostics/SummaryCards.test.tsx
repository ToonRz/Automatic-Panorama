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

  it("names the one-based pair the worst inlier ratio and reprojection error came from (A3)", () => {
    render(<SummaryCards diagnostics={successWithOverlayFixture.diagnostics} mimeType="image/png" />);
    expect(screen.getByText("pair 2 → 3")).toBeInTheDocument();
    expect(screen.getByText("pair 1 → 2")).toBeInTheDocument();
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

  it("keeps every label and qualifier but shows — for every value and secondary line with no result (A15)", () => {
    const { container } = render(<SummaryCards diagnostics={null} />);
    for (const label of ["Keypoints", "Ratio-passed", "Inliers", "Inlier ratio", "Reprojection", "Output"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("lowest pair")).toBeInTheDocument();
    expect(screen.getByText("worst pair")).toBeInTheDocument();
    expect(container.querySelectorAll(".v")).toHaveLength(6);
    expect(container.querySelectorAll(".s")).toHaveLength(6);
    for (const el of [...container.querySelectorAll(".v"), ...container.querySelectorAll(".s")]) {
      expect(el).toHaveTextContent("—");
    }
  });
});
