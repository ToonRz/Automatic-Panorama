import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PairDiagnostic } from "../../types";
import { PartialPairTable } from "./PartialPairTable";

const pairs: PairDiagnostic[] = [
  {
    pair: [0, 1],
    pair_index: 0,
    status: "passed",
    ratio_passed_matches: 146,
    inlier_count: 101,
    inlier_ratio: 0.69,
    reprojection_error: 1.42,
  },
  {
    pair: [1, 2],
    pair_index: 1,
    status: "failed",
    inlier_count: 9,
    inlier_ratio: 0.093,
    failure: { code: "INSUFFICIENT_INLIERS", message: "Images 2 and 3 do not have enough geometric agreement." },
  },
  { pair: [2, 3], pair_index: 2, status: "not_processed" },
];

describe("PartialPairTable", () => {
  it("renders one row per pair with one-based frame numbers", () => {
    render(<PartialPairTable pairs={pairs} />);
    expect(screen.getByTitle("frame 1 → frame 2")).toBeInTheDocument();
    expect(screen.getByTitle("frame 2 → frame 3")).toBeInTheDocument();
    expect(screen.getByTitle("frame 3 → frame 4")).toBeInTheDocument();
  });

  it("labels each row with its own status, not a shared verdict", () => {
    render(<PartialPairTable pairs={pairs} />);
    expect(screen.getByText("accepted")).toBeInTheDocument();
    expect(screen.getByText("rejected")).toBeInTheDocument();
    expect(screen.getByText("not processed")).toBeInTheDocument();
  });

  it("shows measured values for a passed pair and the failure message for a failed pair", () => {
    render(<PartialPairTable pairs={pairs} />);
    expect(screen.getByText("146")).toBeInTheDocument();
    expect(screen.getByText("69%")).toBeInTheDocument();
    expect(screen.getByText("1.42 px")).toBeInTheDocument();
    expect(screen.getByText(/do not have enough geometric agreement/)).toBeInTheDocument();
  });

  it("shows an em dash rather than a fabricated 0 for a not-processed pair", () => {
    render(<PartialPairTable pairs={pairs} />);
    const notProcessedRow = screen.getByText("not processed").closest("tr");
    expect(notProcessedRow).not.toBeNull();
    expect(notProcessedRow!.textContent).toMatch(/—/);
    expect(notProcessedRow!.textContent).not.toMatch(/\b0\b/);
  });

  it("uses file names in the pair title when files are supplied", () => {
    render(<PartialPairTable pairs={pairs} files={[{ name: "a.jpg" }, { name: "b.jpg" }]} />);
    expect(screen.getByTitle("a.jpg → b.jpg")).toBeInTheDocument();
  });
});
