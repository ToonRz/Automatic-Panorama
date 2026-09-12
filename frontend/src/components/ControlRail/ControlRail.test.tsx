import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ControlRail } from "./ControlRail";

const baseProps = {
  files: [],
  onFilesSelected: vi.fn(),
  detector: "SIFT" as const,
  onDetectorChange: vi.fn(),
  ratioThreshold: 0.75,
  onRatioChange: vi.fn(),
  ransacThreshold: 5,
  onRansacChange: vi.fn(),
  onSubmit: vi.fn(),
};

describe("ControlRail primary button", () => {
  it("disables with the empty-state label below two files", () => {
    render(<ControlRail {...baseProps} state="empty" />);
    const button = screen.getByRole("button", { name: /add two frames to start/i });
    expect(button).toBeDisabled();
  });

  it("enables 'Stitch panorama' when ready", () => {
    render(<ControlRail {...baseProps} state="ready" />);
    expect(screen.getByRole("button", { name: /stitch panorama/i })).toBeEnabled();
  });

  it("disables with 'Stitching…' while working", () => {
    render(<ControlRail {...baseProps} state="working" />);
    expect(screen.getByRole("button", { name: /stitching/i })).toBeDisabled();
  });

  it("offers 'Stitch again' when complete", () => {
    render(<ControlRail {...baseProps} state="complete" />);
    expect(screen.getByRole("button", { name: /stitch again/i })).toBeEnabled();
  });

  it("offers 'Retry with ORB' when failed with SIFT, and submits with the ORB override", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ControlRail {...baseProps} state="failed" detector="SIFT" onSubmit={onSubmit} />);
    const button = screen.getByRole("button", { name: /retry with orb/i });
    await user.click(button);
    expect(onSubmit).toHaveBeenCalledWith({ detector: "ORB" });
  });

  it("offers 'Try again' when failed with ORB already selected", () => {
    render(<ControlRail {...baseProps} state="failed" detector="ORB" />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeEnabled();
  });

  it("hides the dropzone while working or complete", () => {
    const { rerender } = render(<ControlRail {...baseProps} state="working" />);
    expect(screen.queryByLabelText(/drop overlapping images/i)).not.toBeInTheDocument();
    rerender(<ControlRail {...baseProps} state="complete" />);
    expect(screen.queryByLabelText(/drop overlapping images/i)).not.toBeInTheDocument();
    rerender(<ControlRail {...baseProps} state="ready" />);
    expect(screen.getByText(/drop overlapping images/i)).toBeInTheDocument();
  });
});
