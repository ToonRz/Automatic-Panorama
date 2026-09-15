import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { successWithOverlayFixture, successWithoutOverlayFixture } from "../../fixtures";
import { FeatureSurvivalFunnel } from "./FeatureSurvivalFunnel";

/**
 * jsdom has no `window.matchMedia` implementation, so the component's
 * `useIsCompactViewport` hook falls back to `false` (desktop) unless a
 * test stubs it -- which is also why every other test in this file, run
 * without this stub, exercises the desktop Sankey layout unchanged.
 */
function stubCompactViewport(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

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

describe("FeatureSurvivalFunnel (compact / mobile layout)", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    stubCompactViewport(true);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("renders the vertical trapezoid funnel with stage counts and drop-off connectors", () => {
    const { container } = render(
      <FeatureSurvivalFunnel
        diagnostics={successWithoutOverlayFixture.diagnostics}
        files={[{ name: "img_01.jpg" }, { name: "img_02.jpg" }]}
      />,
    );

    // Sankey-only markup is gone; trapezoid markup stands in for it.
    expect(container.querySelector(".funnel-stage")).not.toBeInTheDocument();
    const trapezoid = container.querySelector(".mtrapezoid");
    expect(trapezoid).toBeInTheDocument();
    expect(trapezoid!.textContent).toContain("1,780");
    expect(trapezoid!.textContent).toContain("200");
    expect(trapezoid!.textContent).toContain("150");

    const connectors = container.querySelectorAll(".mtrapezoid-conn .chip");
    expect(connectors[0].textContent).toBe("−1,580 discarded · 88.8%");
    expect(connectors[1].textContent).toBe("−50 outliers · 25.0%");

    expect(container.querySelector(".mtrapezoid-survival")!.textContent).toContain("8.4%");
  });

  it("collapses and expands the frame list", async () => {
    const user = userEvent.setup();
    render(
      <FeatureSurvivalFunnel
        diagnostics={successWithoutOverlayFixture.diagnostics}
        files={[{ name: "img_01.jpg" }, { name: "img_02.jpg" }]}
      />,
    );

    const toggle = screen.getByRole("button", { name: /Frames · 2/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("renders the RANSAC outcome chips with the anchor frame name", () => {
    const { container } = render(
      <FeatureSurvivalFunnel
        diagnostics={successWithoutOverlayFixture.diagnostics}
        files={[{ name: "img_01.jpg" }, { name: "img_02.jpg" }]}
      />,
    );

    const outcomes = container.querySelector(".moutcomes");
    expect(outcomes).toBeInTheDocument();
    expect(screen.getByText("Anchor frame")).toBeInTheDocument();
    expect(screen.getByText("Outliers filtered")).toBeInTheDocument();
    // "img_01.jpg" also appears (with an ANCHOR tag) in the frame list above,
    // so scope this assertion to the outcome chip rather than the whole page.
    expect(outcomes!.textContent).toContain("img_01.jpg");
    expect(outcomes!.textContent).toContain("50");
  });

  it("still opens the data table (as a bottom sheet) when View as table is clicked", async () => {
    const user = userEvent.setup();
    render(
      <FeatureSurvivalFunnel
        diagnostics={successWithOverlayFixture.diagnostics}
        files={[{ name: "a.jpg" }, { name: "b.jpg" }, { name: "c.jpg" }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "View as table" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close modal" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
