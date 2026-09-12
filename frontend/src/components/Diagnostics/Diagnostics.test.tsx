import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { successWithOverlayFixture } from "../../fixtures";
import { Diagnostics } from "./Diagnostics";

describe("Diagnostics", () => {
  it("renders the header chip from detector, image_count, and one-based image_order", () => {
    render(<Diagnostics result={successWithOverlayFixture} />);
    expect(screen.getByText(/SIFT · 3 frames · order 1 → 2 → 3/)).toBeInTheDocument();
  });

  it("renders the summary cards, the per-pair table, and the stage chart together", () => {
    render(<Diagnostics result={successWithOverlayFixture} />);
    expect(screen.getByText("Keypoints")).toBeInTheDocument();
    expect(screen.getByText("Per-pair geometry")).toBeInTheDocument();
    expect(screen.getByText(/ms total/)).toBeInTheDocument();
  });
});
