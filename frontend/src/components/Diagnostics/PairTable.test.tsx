import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { successWithOverlayFixture, successWithoutOverlayFixture } from "../../fixtures";
import { PairTable } from "./PairTable";

describe("PairTable", () => {
  it("renders one row per pair for a three-image run", () => {
    render(<PairTable diagnostics={successWithOverlayFixture.diagnostics} />);
    expect(screen.getByText("0 → 1")).toBeInTheDocument();
    expect(screen.getByText("1 → 2")).toBeInTheDocument();
    expect(screen.getAllByText("accepted")).toHaveLength(2);
  });

  it("renders exactly one row for a two-image run", () => {
    render(<PairTable diagnostics={successWithoutOverlayFixture.diagnostics} />);
    expect(screen.getByText("0 → 1")).toBeInTheDocument();
    expect(screen.getAllByText("accepted")).toHaveLength(1);
  });
});
