import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { successWithoutOverlayFixture } from "../../fixtures";
import { StageChart } from "./StageChart";

describe("StageChart", () => {
  it("renders every known stage plus an unrecognised key as an extra bar, using the key as its label", () => {
    render(<StageChart stageTimingsMs={successWithoutOverlayFixture.diagnostics.stage_timings_ms} />);
    for (const key of ["decode", "features", "matching", "homography", "warp", "blend"]) {
      expect(screen.getByText(key)).toBeInTheDocument();
    }
    expect(screen.getByText("postprocess")).toBeInTheDocument();
  });

  it("recognises encode as the seventh backend stage", () => {
    render(<StageChart stageTimingsMs={{ encode: 4.2 }} />);
    expect(screen.getByText("encode")).toBeInTheDocument();
  });

  it("states the sum of every stage as the chart total, including the unrecognised key", () => {
    render(<StageChart stageTimingsMs={successWithoutOverlayFixture.diagnostics.stage_timings_ms} />);
    // 18.0+62.1+6.4+2.2+41.0+37.9+15.4 = 183.0
    expect(screen.getByText(/183\.0 ms total/)).toBeInTheDocument();
  });

  it("scales the peak stage's bar to 100 percent width", () => {
    render(<StageChart stageTimingsMs={{ a: 10, b: 40 }} />);
    const fills = document.querySelectorAll(".fill");
    const widths = Array.from(fills).map((el) => (el as HTMLElement).style.width);
    expect(widths).toContain("100%");
    expect(widths).toContain("25%");
  });
});
