import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { insufficientInliersError, unrecognizedCodeError } from "../../fixtures";
import { OutputCanvas } from "./OutputCanvas";

describe("OutputCanvas", () => {
  it("shows the placeholder ribbon for empty and ready, and no working/error content", () => {
    render(
      <OutputCanvas state="empty" isColdStart={false} error={null} result={null} isStale={false} />,
    );
    expect(screen.getByText(/the panorama lands here/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the seven-stage checklist and no numeric timing while working (A2)", () => {
    render(
      <OutputCanvas
        state="working"
        isColdStart={false}
        error={null}
        result={null}
        isStale={false}
      />,
    );
    expect(screen.getByText(/decode & normalize frames/i)).toBeInTheDocument();
    expect(screen.getByText(/blend and crop/i)).toBeInTheDocument();
    expect(screen.getByText(/encode png/i)).toBeInTheDocument();
    expect(screen.queryByText(/ms/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cold start|waking/i)).not.toBeInTheDocument();
  });

  it("adds the cold-start note only once the threshold has passed", () => {
    render(
      <OutputCanvas state="working" isColdStart={true} error={null} result={null} isStale={false} />,
    );
    expect(screen.getByText(/waking up/i)).toBeInTheDocument();
  });

  it("renders the failed state's heading, code, and remedy from the error detail", () => {
    render(
      <OutputCanvas
        state="failed"
        isColdStart={false}
        error={insufficientInliersError}
        result={null}
        isStale={false}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/422 · INSUFFICIENT_INLIERS/)).toBeInTheDocument();
    expect(screen.getByText(/re-shoot the named frame/i)).toBeInTheDocument();
  });

  it("renders the generic remedy for an unrecognised code (A7)", () => {
    render(
      <OutputCanvas
        state="failed"
        isColdStart={false}
        error={unrecognizedCodeError}
        result={null}
        isStale={false}
      />,
    );
    expect(screen.getByText(/try different photos or fewer frames/i)).toBeInTheDocument();
  });

  it("marks a complete result as produced with previous settings when stale", () => {
    render(
      <OutputCanvas
        state="complete"
        isColdStart={false}
        error={null}
        result={null}
        isStale={true}
      />,
    );
    expect(screen.getByText(/produced with previous settings/i)).toBeInTheDocument();
  });
});
