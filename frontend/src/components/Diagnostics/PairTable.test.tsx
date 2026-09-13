import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { successWithOverlayFixture, successWithoutOverlayFixture } from "../../fixtures";
import { PairTable } from "./PairTable";

/** The pair cell's "N → M" text is split across two <b> badges and an arrow. */
function getPairCell(text: string) {
  return screen.getByText(
    (_, element) => element?.classList.contains("pair") === true && element.textContent === text,
  );
}

describe("PairTable", () => {
  it("renders one-based row per pair for a three-image run", () => {
    render(<PairTable diagnostics={successWithOverlayFixture.diagnostics} />);
    expect(getPairCell("1 → 2")).toBeInTheDocument();
    expect(getPairCell("2 → 3")).toBeInTheDocument();
    expect(screen.getAllByText("accepted")).toHaveLength(2);
  });

  it("renders exactly one one-based row for a two-image run", () => {
    render(<PairTable diagnostics={successWithoutOverlayFixture.diagnostics} />);
    expect(getPairCell("1 → 2")).toBeInTheDocument();
    expect(screen.getAllByText("accepted")).toHaveLength(1);
  });

  it("puts the pair's file names in the cell's title", () => {
    render(
      <PairTable
        diagnostics={successWithoutOverlayFixture.diagnostics}
        files={[{ name: "a.jpg" }, { name: "b.jpg" }]}
      />,
    );
    expect(getPairCell("1 → 2").title).toBe("a.jpg → b.jpg");
  });

  it("shows the aside pair count and 'all accepted' with a result", () => {
    render(<PairTable diagnostics={successWithOverlayFixture.diagnostics} />);
    expect(screen.getByText("2 pairs · all accepted")).toBeInTheDocument();
  });

  it("keeps its header and shows one placeholder row with no result (A15)", () => {
    render(<PairTable diagnostics={null} />);
    expect(screen.getByText("Per-pair geometry")).toBeInTheDocument();
    expect(screen.getByText("Pair")).toBeInTheDocument();
    expect(screen.getByText("No accepted pairs yet")).toBeInTheDocument();
    expect(screen.queryByText(/pairs · all accepted/)).not.toBeInTheDocument();
  });
});
