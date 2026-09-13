import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Overlay } from "./Overlay";

describe("Overlay", () => {
  it("keeps a seam label inside the image when the seam's top point is cropped off", () => {
    // A tilted seam near the right border whose top point sits above the
    // cropped panorama, as the backend reports for a right-to-left pan.
    render(
      <Overlay
        width={1448}
        height={588}
        seamLines={[{ top: [1400, -52], bottom: [1390, 588] }]}
        correspondencesPerPair={[[]]}
        inliersPerPair={[568]}
      />,
    );

    const label = screen.getByText(/SEAM 01 · 568 inliers/);
    expect(Number(label.getAttribute("y"))).toBeGreaterThan(0);
    expect(label).toHaveAttribute("text-anchor", "end");
    expect(Number(label.getAttribute("x"))).toBeLessThanOrEqual(1448);
  });

  it("anchors a label right of a seam that has room", () => {
    render(
      <Overlay
        width={1448}
        height={588}
        seamLines={[{ top: [550, 0], bottom: [560, 588] }]}
        correspondencesPerPair={[[]]}
        inliersPerPair={[457]}
      />,
    );

    const label = screen.getByText(/SEAM 01 · 457 inliers/);
    expect(label).toHaveAttribute("x", "562");
    expect(label).toHaveAttribute("y", "28");
    expect(label).toHaveAttribute("text-anchor", "start");
  });

  it("drops each later seam's label a line lower so close seams stay readable", () => {
    render(
      <Overlay
        width={1448}
        height={588}
        seamLines={[
          { top: [560, 0], bottom: [548, 588] },
          { top: [288, 0], bottom: [288, 588] },
        ]}
        correspondencesPerPair={[[], []]}
        inliersPerPair={[457, 568]}
      />,
    );

    expect(screen.getByText(/SEAM 01 · 457 inliers/)).toHaveAttribute("y", "28");
    expect(screen.getByText(/SEAM 02 · 568 inliers/)).toHaveAttribute("y", "60");
  });
});
