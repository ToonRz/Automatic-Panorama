import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { successWithOverlayFixture, successWithoutOverlayFixture } from "../../fixtures";
import { PairTable } from "./PairTable";

describe("PairTable", () => {
  it("renders one-based row per pair for a three-image run", () => {
    render(<PairTable diagnostics={successWithOverlayFixture.diagnostics} />);
    expect(screen.getByText("1 → 2")).toBeInTheDocument();
    expect(screen.getByText("2 → 3")).toBeInTheDocument();
    expect(screen.getAllByText("accepted")).toHaveLength(2);
  });

  it("renders exactly one one-based row for a two-image run", () => {
    render(<PairTable diagnostics={successWithoutOverlayFixture.diagnostics} />);
    expect(screen.getByText("1 → 2")).toBeInTheDocument();
    expect(screen.getAllByText("accepted")).toHaveLength(1);
  });

  it("puts the pair's file names in the cell's title", () => {
    render(
      <PairTable
        diagnostics={successWithoutOverlayFixture.diagnostics}
        files={[{ name: "a.jpg" }, { name: "b.jpg" }]}
      />,
    );
    expect(screen.getByText("1 → 2").title).toBe("a.jpg → b.jpg");
  });
});
