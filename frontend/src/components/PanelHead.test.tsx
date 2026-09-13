import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PanelHead } from "./PanelHead";

describe("PanelHead", () => {
  it("renders the index badge, title, and aside", () => {
    render(<PanelHead index={1} title="Source frames" aside="3 / 8" />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Source frames" })).toBeInTheDocument();
    expect(screen.getByText("3 / 8")).toBeInTheDocument();
  });

  it("omits the aside element when none is given", () => {
    const { container } = render(<PanelHead index={2} title="Method" />);
    expect(container.querySelector(".aside")).not.toBeInTheDocument();
  });

  it("renders trailing children after the title", () => {
    render(
      <PanelHead index={3} title="Panorama">
        <span>Waiting for frames</span>
      </PanelHead>,
    );
    expect(screen.getByText("Waiting for frames")).toBeInTheDocument();
  });
});
