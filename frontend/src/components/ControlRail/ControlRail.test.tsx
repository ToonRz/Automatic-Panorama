import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ControlRail } from "./ControlRail";
import { FALLBACK_CONFIG } from "../../constants/config";
import { RANSAC_MAX, RANSAC_MIN, RATIO_MAX, RATIO_MIN } from "../../constants/thresholds";

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
  onSampleSelected: vi.fn(),
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

  it("keeps the ready placeholder controls visible but disables both radios while preparing", () => {
    render(<ControlRail {...baseProps} state="preparing" />);
    expect(screen.getByText(/drop overlapping images/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /preparing images/i })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "SIFT" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "ORB" })).toBeDisabled();
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
    const head = screen.getByText("Source frames").closest(".panel-head");
    expect(head).toHaveTextContent("0 / 5");
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

  it("shows the combined dimensions-and-size meta line, and counts prepared bytes in the total row", () => {
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
    expect(screen.getByText("4032×3024 → 1600×1200 · 10 KB")).toBeInTheDocument();
    // The order/total row shows the prepared total, not File.size (1 byte).
    expect(screen.getByText("10 KB")).toBeInTheDocument();
    expect(
      screen.getByText("Frames stitch in list order — capture order, left to right."),
    ).toBeInTheDocument();
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

  it("shows the action-footer meta row once a file is chosen (n frames · detector, prepared bytes)", () => {
    const files = [
      new File([new Uint8Array(10 * 1024)], "a.jpg", { type: "image/jpeg" }),
      new File([new Uint8Array(10 * 1024)], "b.jpg", { type: "image/jpeg" }),
    ];
    render(
      <ControlRail
        {...baseProps}
        state="ready"
        files={files}
        fileErrors={[null, null]}
        detector="ORB"
      />,
    );
    expect(screen.getByText("2 frames · ORB")).toBeInTheDocument();
    expect(screen.getByText("≈ 20 KB upload")).toBeInTheDocument();
  });

  it("omits the action-footer meta row with no files chosen", () => {
    render(<ControlRail {...baseProps} state="empty" />);
    expect(screen.queryByText(/upload$/i)).not.toBeInTheDocument();
  });
});

describe("ControlRail detector radiogroup (A17)", () => {
  it("is a radiogroup named 'Feature detector' with radios named SIFT and ORB", () => {
    render(<ControlRail {...baseProps} state="ready" />);
    const group = screen.getByRole("radiogroup", { name: "Feature detector" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "SIFT" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "ORB" })).not.toBeChecked();
  });

  it("enables both radios in the ready state", () => {
    render(<ControlRail {...baseProps} state="ready" />);
    expect(screen.getByRole("radio", { name: "SIFT" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "ORB" })).toBeEnabled();
  });

  it("clicking ORB calls onDetectorChange('ORB')", async () => {
    const onDetectorChange = vi.fn();
    const user = userEvent.setup();
    render(<ControlRail {...baseProps} state="ready" onDetectorChange={onDetectorChange} />);
    await user.click(screen.getByRole("radio", { name: "ORB" }));
    expect(onDetectorChange).toHaveBeenCalledWith("ORB");
  });

  it("moves the selection with the arrow keys and calls onDetectorChange", async () => {
    const onDetectorChange = vi.fn();
    const user = userEvent.setup();
    render(<ControlRail {...baseProps} state="ready" onDetectorChange={onDetectorChange} />);
    screen.getByRole("radio", { name: "SIFT" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onDetectorChange).toHaveBeenCalledWith("ORB");
  });

  it("disables both radios while working or preparing", () => {
    const { rerender } = render(<ControlRail {...baseProps} state="working" />);
    expect(screen.getByRole("radio", { name: "SIFT" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "ORB" })).toBeDisabled();
    rerender(<ControlRail {...baseProps} state="preparing" />);
    expect(screen.getByRole("radio", { name: "SIFT" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "ORB" })).toBeDisabled();
  });
});

describe("ControlRail sliders (--p custom property)", () => {
  it("sets --p to 0% at the minimum, 100% at the maximum, and proportional in between", () => {
    const { rerender } = render(<ControlRail {...baseProps} state="ready" ratioThreshold={RATIO_MIN} />);
    const ratioInput = screen.getByLabelText(/lowe ratio test/i) as HTMLInputElement;
    expect(ratioInput.style.getPropertyValue("--p")).toBe("0%");

    rerender(<ControlRail {...baseProps} state="ready" ratioThreshold={RATIO_MAX} />);
    expect(
      (screen.getByLabelText(/lowe ratio test/i) as HTMLInputElement).style.getPropertyValue("--p"),
    ).toBe("100%");

    const mid = (RATIO_MIN + RATIO_MAX) / 2;
    rerender(<ControlRail {...baseProps} state="ready" ratioThreshold={mid} />);
    expect(
      (screen.getByLabelText(/lowe ratio test/i) as HTMLInputElement).style.getPropertyValue("--p"),
    ).toBe("50%");
  });

  it("does the same for the RANSAC slider", () => {
    const { rerender } = render(
      <ControlRail {...baseProps} state="ready" ransacThreshold={RANSAC_MIN} />,
    );
    expect(
      (screen.getByLabelText(/ransac tolerance/i) as HTMLInputElement).style.getPropertyValue("--p"),
    ).toBe("0%");

    rerender(<ControlRail {...baseProps} state="ready" ransacThreshold={RANSAC_MAX} />);
    expect(
      (screen.getByLabelText(/ransac tolerance/i) as HTMLInputElement).style.getPropertyValue("--p"),
    ).toBe("100%");
  });
});

describe("ControlRail dropzone variant", () => {
  it("shows the tall variant with no files and the compact variant with files", () => {
    const { rerender } = render(<ControlRail {...baseProps} state="empty" />);
    expect(document.querySelector(".drop.tall")).toBeInTheDocument();
    expect(screen.getByText("Drop overlapping images")).toBeInTheDocument();

    const files = [new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" })];
    rerender(<ControlRail {...baseProps} state="ready" files={files} fileErrors={[null]} />);
    expect(document.querySelector(".drop.tall")).not.toBeInTheDocument();
    expect(screen.getByText("Add more frames")).toBeInTheDocument();
    expect(screen.getByText("Appended after frame 01")).toBeInTheDocument();
  });

  it("shows neither variant in working or complete", () => {
    const { rerender } = render(<ControlRail {...baseProps} state="working" />);
    expect(document.querySelector(".drop")).not.toBeInTheDocument();
    rerender(<ControlRail {...baseProps} state="complete" />);
    expect(document.querySelector(".drop")).not.toBeInTheDocument();
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

  it("replaces the selection with a gallery sample instead of appending it", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob(["jpeg-bytes"], { type: "image/jpeg" }),
    } as unknown as Response);
    const onFilesSelected = vi.fn();
    const onSampleSelected = vi.fn();
    const user = userEvent.setup();
    render(
      <ControlRail
        {...baseProps}
        state="ready"
        files={frames}
        onFilesSelected={onFilesSelected}
        onSampleSelected={onSampleSelected}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Harbour boats/ }));

    await vi.waitFor(() => expect(onSampleSelected).toHaveBeenCalledTimes(1));
    expect(onFilesSelected).not.toHaveBeenCalled();
    vi.restoreAllMocks();
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

  it("allows removing a frame by index in complete state", async () => {
    const onFileRemoved = vi.fn();
    const user = userEvent.setup();
    render(
      <ControlRail
        {...baseProps}
        state="complete"
        files={frames}
        fileErrors={[null, null]}
        onFileRemoved={onFileRemoved}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Remove b.jpg" }));
    expect(onFileRemoved).toHaveBeenCalledWith(1);
  });

  it("renders Clear all and calls onReset when clicked", async () => {
    const onReset = vi.fn();
    const user = userEvent.setup();
    render(
      <ControlRail
        {...baseProps}
        state="complete"
        files={frames}
        fileErrors={[null, null]}
        onReset={onReset}
      />,
    );
    const clearBtn = screen.getByRole("button", { name: /clear all/i });
    expect(clearBtn).toBeInTheDocument();
    await user.click(clearBtn);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("renders + Start new panorama in complete state and calls onReset when clicked", async () => {
    const onReset = vi.fn();
    const user = userEvent.setup();
    render(
      <ControlRail
        {...baseProps}
        state="complete"
        files={frames}
        fileErrors={[null, null]}
        onReset={onReset}
      />,
    );
    const newBtn = screen.getByRole("button", { name: /\+ start new panorama/i });
    expect(newBtn).toBeInTheDocument();
    await user.click(newBtn);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
