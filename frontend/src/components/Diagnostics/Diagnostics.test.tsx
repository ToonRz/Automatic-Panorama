import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { successWithOverlayFixture } from "../../fixtures";
import { Diagnostics } from "./Diagnostics";

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
});
