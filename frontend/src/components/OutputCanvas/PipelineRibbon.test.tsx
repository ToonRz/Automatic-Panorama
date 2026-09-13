import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PIPELINE_STAGES } from "../../constants/pipeline";
import { PipelineRibbon } from "./PipelineRibbon";

describe("PipelineRibbon", () => {
  it("renders seven cells in PIPELINE_STAGES order, each with the short label and full label as title", () => {
    render(<PipelineRibbon mode="idle" />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(7);
    PIPELINE_STAGES.forEach((stage, index) => {
      expect(items[index]).toHaveTextContent(stage.short);
      expect(items[index]).toHaveAttribute("title", stage.label);
    });
  });

  it("exposes the mode as data-mode on the list, and no ms/percentage anywhere", () => {
    const { rerender, container } = render(<PipelineRibbon mode="idle" />);
    expect(container.querySelector("ol")).toHaveAttribute("data-mode", "idle");
    rerender(<PipelineRibbon mode="pending" />);
    expect(container.querySelector("ol")).toHaveAttribute("data-mode", "pending");
    expect(container.textContent).not.toMatch(/ms\b|%/);
    rerender(<PipelineRibbon mode="done" />);
    expect(container.querySelector("ol")).toHaveAttribute("data-mode", "done");
  });
});
