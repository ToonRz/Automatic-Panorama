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
  error: null,
  busySecondsLeft: null,
  hasPreflightErrors: false,
  onFilesSelected: vi.fn(),
  onFileRemoved: vi.fn(),
  detector: "SIFT" as const,
  onDetectorChange: vi.fn(),
  ratioThreshold: 0.75,
  onRatioChange: vi.fn(),
  ransacThreshold: 5,
  onRansacChange: vi.fn(),
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
  cancelledNote: null,
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

  it("shows Cancel only while working, and calls onCancel (I13)", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<ControlRail {...baseProps} state="ready" onCancel={onCancel} />);
    expect(screen.queryByRole("button", { name: /^cancel$/i })).not.toBeInTheDocument();

    rerender(<ControlRail {...baseProps} state="working" onCancel={onCancel} />);
    const cancelButton = screen.getByRole("button", { name: /^cancel$/i });
    await user.click(cancelButton);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("shows the cancelled note in the rail", () => {
    render(
      <ControlRail
        {...baseProps}
        state="ready"
        cancelledNote="Cancelled. The server may still be finishing that run, so the next try might report busy for a moment."
      />,
    );
    expect(screen.getByText(/the next try might report busy/i)).toBeInTheDocument();
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

  it("locks the button with a countdown label during a SERVICE_BUSY wait (I11)", () => {
    render(<ControlRail {...baseProps} state="failed" busySecondsLeft={2} />);
    expect(screen.getByRole("button", { name: /try again in 2s/i })).toBeDisabled();
  });

  it("returns to the normal failed button once the countdown reaches zero", () => {
    render(<ControlRail {...baseProps} state="failed" detector="ORB" busySecondsLeft={0} />);
    expect(screen.getByRole("button", { name: /^try again$/i })).toBeEnabled();
  });

  it("highlights the file rows a server error names (I9)", () => {
    const a = new File(["a"], "IMG_4412.jpg", { type: "image/jpeg" });
    const b = new File(["b"], "IMG_4413.jpg", { type: "image/jpeg" });
    render(
      <ControlRail
        {...baseProps}
        state="failed"
        files={[a, b]}
        fileErrors={[null, null]}
        error={{
          status: 422,
          detail: {
            code: "INSUFFICIENT_INLIERS",
            message: "no agreement",
            context: { pair: [0, 1], pair_index: 0, inliers: 3, required: 12, inlier_ratio: 0.1 },
          },
        }}
      />,
    );
    const files = screen.getAllByLabelText("Selected images")[0];
    expect(files.querySelectorAll(".file.invalid")).toHaveLength(2);
  });
});

describe("ControlRail frame selection", () => {
  const frames = [
    new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" }),
    new File([new Uint8Array(10)], "b.jpg", { type: "image/jpeg" }),
  ];

  it("passes every pick to onFilesSelected, even the same file twice", async () => {
    const onFilesSelected = vi.fn();
    const user = userEvent.setup();
    render(<ControlRail {...baseProps} state="empty" onFilesSelected={onFilesSelected} />);
    const input = screen.getByLabelText(/drop overlapping images/i) as HTMLInputElement;

    await user.upload(input, frames[0]);
    await user.upload(input, frames[0]);
    expect(onFilesSelected).toHaveBeenCalledTimes(2);
    expect(input.value).toBe("");
  });

  it("removes a frame by index while the selection is editable", async () => {
    const onFileRemoved = vi.fn();
    const user = userEvent.setup();
    render(
      <ControlRail
        {...baseProps}
        state="ready"
        files={frames}
        fileErrors={[null, null]}
        onFileRemoved={onFileRemoved}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Remove b.jpg" }));
    expect(onFileRemoved).toHaveBeenCalledWith(1);
  });

  it("hides remove controls while working", () => {
    render(<ControlRail {...baseProps} state="working" files={frames} fileErrors={[null, null]} />);
    expect(screen.queryByRole("button", { name: /^remove/i })).not.toBeInTheDocument();
  });
});
