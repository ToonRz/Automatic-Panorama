import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { successWithOverlayFixture, successWithoutOverlayFixture } from "../../fixtures";
import { ResultPlate } from "./ResultPlate";

describe("ResultPlate", () => {
  it("renders the panorama from image.data_url with a descriptive alt", () => {
    render(<ResultPlate result={successWithOverlayFixture} overlayOn={true} />);
    const img = screen.getByRole("img", { name: /stitched panorama/i });
    expect(img).toHaveAttribute("src", successWithOverlayFixture.image.data_url);
  });

  it("draws the overlay when overlayOn is true and the fields are present", () => {
    render(<ResultPlate result={successWithOverlayFixture} overlayOn={true} />);
    expect(screen.getByRole("img", { name: /seam and inlier overlay/i })).toBeInTheDocument();
    expect(screen.getByText(/SEAM 01 · 457 inliers/)).toBeInTheDocument();
    expect(screen.getByText(/SEAM 02 · 568 inliers/)).toBeInTheDocument();
  });

  it("hides the overlay when overlayOn is false", () => {
    render(<ResultPlate result={successWithOverlayFixture} overlayOn={false} />);
    expect(screen.queryByRole("img", { name: /seam and inlier overlay/i })).not.toBeInTheDocument();
  });

  it("renders no overlay when the fields are absent, even if overlayOn is true", () => {
    render(<ResultPlate result={successWithoutOverlayFixture} overlayOn={true} />);
    expect(screen.queryByRole("img", { name: /seam and inlier overlay/i })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /stitched panorama/i })).toBeInTheDocument();
  });

  it("renders the mono W x H . MP . PNG caption", () => {
    render(<ResultPlate result={successWithOverlayFixture} overlayOn={false} />);
    expect(screen.getByText("1448 × 588 · 0.85 MP · PNG")).toBeInTheDocument();
  });
});
