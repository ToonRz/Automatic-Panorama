import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LABEL_LINE_HEIGHT, LABEL_WIDTH, Overlay } from "./Overlay";

/** A label's baseline and horizontal extent, in output pixels. */
function labelBox(label: HTMLElement) {
  const x = Number(label.getAttribute("x"));
  const left = label.getAttribute("text-anchor") === "end" ? x - LABEL_WIDTH : x;
  return { y: Number(label.getAttribute("y")), left, right: left + LABEL_WIDTH };
}

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

  it("keeps close seams' labels apart when the later seam's top point is a line higher", () => {
    // The bundled 3-frame boat set: seams about 300px apart, the second
    // seam's top point 32px above the first's. Staggering each label from its
    // own top point put both on one line, where the first ran into the second.
    render(
      <Overlay
        width={1875}
        height={660}
        seamLines={[
          { top: [1070, 32], bottom: [1062, 660] },
          { top: [1370, 0], bottom: [1385, 660] },
        ]}
        correspondencesPerPair={[[], []]}
        inliersPerPair={[461, 342]}
      />,
    );

    const first = labelBox(screen.getByText(/SEAM 01 · 461 inliers/));
    const second = labelBox(screen.getByText(/SEAM 02 · 342 inliers/));
    const separateLines = Math.abs(first.y - second.y) >= LABEL_LINE_HEIGHT;
    const separateColumns = first.right <= second.left || second.right <= first.left;
    expect(separateLines || separateColumns).toBe(true);
  });

  it("leaves far-apart seams' labels on the same line", () => {
    render(
      <Overlay
        width={1875}
        height={660}
        seamLines={[
          { top: [400, 0], bottom: [410, 660] },
          { top: [1000, 0], bottom: [990, 660] },
        ]}
        correspondencesPerPair={[[], []]}
        inliersPerPair={[461, 342]}
      />,
    );

    expect(screen.getByText(/SEAM 01 · 461 inliers/)).toHaveAttribute("y", "28");
    expect(screen.getByText(/SEAM 02 · 342 inliers/)).toHaveAttribute("y", "28");
  });
});
