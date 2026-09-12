import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { successWithOverlayFixture, successWithoutOverlayFixture } from "../../fixtures";
import { ResultPlate } from "./ResultPlate";

describe("ResultPlate", () => {
  it("renders the panorama from image.data_url with a descriptive alt", () => {
    render(<ResultPlate result={successWithOverlayFixture} />);
    const img = screen.getByRole("img", { name: /stitched panorama/i });
    expect(img).toHaveAttribute("src", successWithOverlayFixture.image.data_url);
  });

  it("shows the overlay toggle, defaults it on, and flips aria-pressed and the SVG on click (A5)", async () => {
    const user = userEvent.setup();
    render(<ResultPlate result={successWithOverlayFixture} />);

    const toggle = screen.getByRole("button", { name: /seams & inliers/i });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: /seam and inlier overlay/i })).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("img", { name: /seam and inlier overlay/i })).not.toBeInTheDocument();
  });

  it("draws one seam label per pair reading the inlier count from inliers_per_pair, not the sample count", () => {
    render(<ResultPlate result={successWithOverlayFixture} />);
    // Pair 0 has 101 inliers but only 2 sampled correspondences in the fixture.
    expect(screen.getByText(/SEAM 01 · 101 inliers/)).toBeInTheDocument();
    expect(screen.getByText(/SEAM 02 · 87 inliers/)).toBeInTheDocument();
  });

  it("renders no toggle and no overlay when the fields are absent, with no error", () => {
    render(<ResultPlate result={successWithoutOverlayFixture} />);
    expect(screen.queryByRole("button", { name: /seams & inliers/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /seam and inlier overlay/i })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /stitched panorama/i })).toBeInTheDocument();
  });

  it("states the output dimensions on the download button", () => {
    render(<ResultPlate result={successWithOverlayFixture} />);
    expect(screen.getByRole("button", { name: /download png · 3840 × 1380/i })).toBeInTheDocument();
  });

  it("downloads the clean image under the lowercased section 6.3 filename (A6)", async () => {
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<ResultPlate result={successWithOverlayFixture} />);

    await user.click(screen.getByRole("button", { name: /download png/i }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe("panorama-sift-3840x1380.png");
    expect(anchor.href).toBe(successWithOverlayFixture.image.data_url);

    clickSpy.mockRestore();
  });
});
