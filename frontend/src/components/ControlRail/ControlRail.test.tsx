import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ControlRail } from "./ControlRail";
import { FALLBACK_CONFIG } from "../../constants/config";

const baseProps = {
  files: [],
  preparedImages: [],
  config: FALLBACK_CONFIG,
  fileErrors: [],
  totalError: null,
  selectionError: null,
  hasPreflightErrors: false,
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

  it("keeps the ready placeholder controls visible but disabled while preparing", () => {
    render(<ControlRail {...baseProps} state="preparing" />);
    expect(screen.getByText(/drop overlapping images/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /preparing images/i })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: /feature detector/i })).toBeDisabled();
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

  it("shows server count policy and the over-count selection message", () => {
    render(
      <ControlRail
        {...baseProps}
        state="ready"
        config={{ ...FALLBACK_CONFIG, max_upload_files: 5 }}
        selectionError="Choose up to 5 frames. You chose 6."
      />,
    );
    expect(screen.getByText("0 / 5")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Choose up to 5 frames. You chose 6.");
  });

  it("disables submission while a row is invalid", () => {
    render(
      <ControlRail
        {...baseProps}
        state="ready"
        files={[new File(["x"], "notes.txt", { type: "text/plain" })]}
        fileErrors={["notes.txt can't be read in this browser."]}
        hasPreflightErrors
      />,
    );
    expect(screen.getByText(/can't be read in this browser/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fix the marked frames/i })).toBeDisabled();
  });

  it("shows original-to-upload dimensions and counts prepared bytes", () => {
    const original = new File([new Uint8Array(20)], "IMG_4412.jpg", { type: "image/jpeg" });
    const upload = new File([new Uint8Array(10 * 1024)], "IMG_4412.jpg", { type: "image/jpeg" });
    render(
      <ControlRail
        {...baseProps}
        state="ready"
        files={[original]}
        preparedImages={[{
          original,
          upload,
          uploadName: upload.name,
          originalWidth: 4032,
          originalHeight: 3024,
          uploadWidth: 1600,
          uploadHeight: 1200,
          resized: true,
        }]}
      />,
    );
    expect(screen.getByText("4032×3024 → 1600×1200")).toBeInTheDocument();
    expect(screen.getByText(/upload total · 10 KB/i)).toBeInTheDocument();
  });
});
