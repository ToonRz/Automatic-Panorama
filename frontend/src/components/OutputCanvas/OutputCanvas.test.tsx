import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PIPELINE_STAGES } from "../../constants/pipeline";
import {
  insufficientInliersError,
  successWithOverlayFixture,
  successWithoutOverlayFixture,
  unrecognizedCodeError,
} from "../../fixtures";
import { OutputCanvas } from "./OutputCanvas";

const baseProps = {
  isColdStart: false,
  error: null,
  result: null,
  isStale: false,
  detector: "SIFT" as const,
  ratioThreshold: 0.75,
  ransacThreshold: 5,
};

describe("OutputCanvas", () => {
  it("shows the 'Waiting for frames' chip and placeholder for empty, and no working/error content", () => {
    render(<OutputCanvas {...baseProps} state="empty" />);
    expect(screen.getByText(/the panorama lands here/i)).toBeInTheDocument();
    expect(screen.getByText("Waiting for frames")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the ready placeholder built from the current selection and settings, and announces preparing once", () => {
    render(
      <OutputCanvas {...baseProps} state="preparing" files={[{ name: "a.jpg" }, { name: "b.jpg" }]} />,
    );
    expect(screen.getByText("Preparing 2 frames…")).toBeInTheDocument();
    expect(screen.getByText(/matched with SIFT at ratio 0.75/i)).toBeInTheDocument();
    expect(screen.getAllByText("Preparing images…")).toHaveLength(1);
    expect(screen.getByText("Preparing").closest(".chip")).toHaveClass("run");
  });

  it("shows the ready chip and copy with the frame count", () => {
    render(<OutputCanvas {...baseProps} state="ready" files={[{ name: "a.jpg" }, { name: "b.jpg" }]} />);
    expect(screen.getByText("Ready · 2 frames")).toBeInTheDocument();
    expect(screen.getByText("2 frames ready to stitch")).toBeInTheDocument();
  });

  it("shows the working illustration, the Running chip, and no numeric timing anywhere in the panel (A2)", () => {
    const { container } = render(
      <OutputCanvas {...baseProps} state="working" files={[{ name: "a.jpg" }, { name: "b.jpg" }]} />,
    );
    expect(screen.getByText("Stitching 2 frames with SIFT…")).toBeInTheDocument();
    expect(screen.getByText("Running").closest(".chip")).toHaveClass("run");
    for (const stage of PIPELINE_STAGES) {
      expect(screen.getByText(stage.short)).toBeInTheDocument();
    }
    expect(container.querySelector(".ribbon")).toHaveAttribute("data-mode", "pending");
    expect(container.textContent).not.toMatch(/\d+(\.\d+)?\s?ms\b/);
    expect(container.textContent).not.toMatch(/\d+%/);
    expect(screen.queryByText(/cold start|waking/i)).not.toBeInTheDocument();
  });

  it("adds the cold-start note only once the threshold has passed", () => {
    render(<OutputCanvas {...baseProps} state="working" isColdStart={true} />);
    expect(screen.getByText(/waking up/i)).toBeInTheDocument();
  });

  it("renders the failed card in code -> heading -> message -> measurements -> chips -> remedies order (A7)", () => {
    render(<OutputCanvas {...baseProps} state="failed" error={insufficientInliersError} />);
    const card = screen.getByRole("alert");
    expect(card).toHaveClass("failcard");
    const children = Array.from(card.children).map((el) => el.tagName);
    expect(children).toEqual(["SPAN", "H3", "P", "UL", "DIV", "UL"]);
    expect(screen.getByText(/422 · INSUFFICIENT_INLIERS/)).toBeInTheDocument();
    expect(screen.getByText(/re-shoot with more overlap/i)).toBeInTheDocument();
    expect(screen.getByText("Rejected").closest(".chip")).toHaveClass("fail");
  });

  it("renders the generic remedy for an unrecognised code (A7)", () => {
    render(<OutputCanvas {...baseProps} state="failed" error={unrecognizedCodeError} />);
    expect(screen.getByText(/try different photos or fewer frames/i)).toBeInTheDocument();
  });

  it("shows the complete chips (detector, frame count, order) and the stale chip when isStale", () => {
    render(
      <OutputCanvas {...baseProps} state="complete" result={successWithOverlayFixture} isStale={true} />,
    );
    expect(screen.getByText("Complete").closest(".chip")).toHaveClass("pass");
    expect(screen.getByText("SIFT")).toBeInTheDocument();
    expect(screen.getByText("3 frames")).toBeInTheDocument();
    expect(screen.getByText("order 1 → 2 → 3")).toBeInTheDocument();
    expect(screen.getByText("Produced with previous settings").closest(".chip")).toHaveClass("run");
  });

  it("omits the stale chip when the result is not stale", () => {
    render(
      <OutputCanvas {...baseProps} state="complete" result={successWithOverlayFixture} isStale={false} />,
    );
    expect(screen.queryByText("Produced with previous settings")).not.toBeInTheDocument();
  });

  it("marks the ribbon done in complete and idle elsewhere", () => {
    const { container, rerender } = render(<OutputCanvas {...baseProps} state="empty" />);
    expect(container.querySelector(".ribbon")).toHaveAttribute("data-mode", "idle");
    rerender(<OutputCanvas {...baseProps} state="failed" error={insufficientInliersError} />);
    expect(container.querySelector(".ribbon")).toHaveAttribute("data-mode", "idle");
    rerender(<OutputCanvas {...baseProps} state="complete" result={successWithOverlayFixture} />);
    expect(container.querySelector(".ribbon")).toHaveAttribute("data-mode", "done");
  });

  describe("complete state tools (moved from ResultPlate, A5/A6)", () => {
    it("shows the overlay toggle in the head, defaulting on, and flips aria-pressed and overlay visibility", async () => {
      const user = userEvent.setup();
      render(<OutputCanvas {...baseProps} state="complete" result={successWithOverlayFixture} />);

      const toggle = screen.getByRole("button", { name: /seams & inliers/i });
      expect(toggle).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("img", { name: /seam and inlier overlay/i })).toBeInTheDocument();

      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-pressed", "false");
      expect(screen.queryByRole("img", { name: /seam and inlier overlay/i })).not.toBeInTheDocument();
    });

    it("omits the toggle when the overlay fields are absent, with no error", () => {
      render(<OutputCanvas {...baseProps} state="complete" result={successWithoutOverlayFixture} />);
      expect(screen.queryByRole("button", { name: /seams & inliers/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("img", { name: /seam and inlier overlay/i })).not.toBeInTheDocument();
      expect(screen.getByRole("img", { name: /stitched panorama/i })).toBeInTheDocument();
    });

    it("names the download button with the output dimensions regardless of viewport (A6)", () => {
      render(<OutputCanvas {...baseProps} state="complete" result={successWithOverlayFixture} />);
      expect(
        screen.getByRole("button", { name: "Download PNG 1448×588" }),
      ).toBeInTheDocument();
    });

    it("downloads the clean image under the lowercased section 6.3 filename (A6)", async () => {
      const user = userEvent.setup();
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
      render(<OutputCanvas {...baseProps} state="complete" result={successWithOverlayFixture} />);

      await user.click(screen.getByRole("button", { name: /download png/i }));

      expect(clickSpy).toHaveBeenCalledTimes(1);
      const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
      expect(anchor.download).toBe("panorama-sift-1448x588.png");
      expect(anchor.href).toBe(successWithOverlayFixture.image.data_url);

      clickSpy.mockRestore();
    });
  });
});
