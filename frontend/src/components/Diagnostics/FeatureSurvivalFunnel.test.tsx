import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { successWithOverlayFixture, successWithoutOverlayFixture } from "../../fixtures";
import { FeatureSurvivalFunnel } from "./FeatureSurvivalFunnel";

describe("FeatureSurvivalFunnel", () => {
  it("renders empty state without digits when diagnostics is null", () => {
    const { container } = render(<FeatureSurvivalFunnel diagnostics={null} />);
    expect(screen.getByText("Feature & Inlier Survival Funnel")).toBeInTheDocument();
    expect(screen.getByText("Filled in after a successful stitch run.")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d/);
  });

  it("renders frame nodes, keypoint numbers, filter pills and inlier metrics when diagnostics is provided", () => {
    render(
      <FeatureSurvivalFunnel
        diagnostics={successWithoutOverlayFixture.diagnostics}
        files={[{ name: "img_01.jpg" }, { name: "img_02.jpg" }]}
      />,
    );

    // Frame nodes
    expect(screen.getByText(/img_01\.jpg/)).toBeInTheDocument();
    expect(screen.getByText(/img_02\.jpg/)).toBeInTheDocument();
    expect(screen.getByText("(Anchor)")).toBeInTheDocument();

    // Keypoint numbers
    expect(screen.getByText("900")).toBeInTheDocument();
    expect(screen.getByText("880")).toBeInTheDocument();

    // Filter pills
    expect(screen.getByText("Passed Lowe's Ratio (≤ 0.75)")).toBeInTheDocument();
    expect(screen.getByText("Ambiguous / Discarded (> 0.75)")).toBeInTheDocument();

    // RANSAC inliers
    expect(screen.getByText("RANSAC Inliers")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();

    // Footer metrics
    expect(screen.getByText("Total Keypoints")).toBeInTheDocument();
    expect(screen.getByText("1,780")).toBeInTheDocument();
    expect(screen.getByText("75.0%")).toBeInTheDocument();
  });

  it("opens and closes the table modal when View as table is clicked", async () => {
    const user = userEvent.setup();
    render(
      <FeatureSurvivalFunnel
        diagnostics={successWithOverlayFixture.diagnostics}
        files={[{ name: "a.jpg" }, { name: "b.jpg" }, { name: "c.jpg" }]}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const viewAsTableBtn = screen.getByRole("button", { name: "View as table" });
    await user.click(viewAsTableBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Feature Triage & Alignment Metrics")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "Close modal" });
    await user.click(closeBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
