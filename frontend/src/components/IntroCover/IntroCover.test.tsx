import { StrictMode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IntroCover } from "./IntroCover";

describe("IntroCover", () => {
  it("renders the 3-line typewriter typography", () => {
    render(<IntroCover backendStatus="checking" />);
    expect(screen.getByText("AUTOMATIC")).toBeInTheDocument();
    expect(screen.getByText("PANORAMA")).toBeInTheDocument();
    expect(screen.getByText("STITCHER")).toBeInTheDocument();
  });

  it.each(["checking", "waking"] as const)("allows entering immediately while %s", (status) => {
    const onDismiss = vi.fn();
    render(<IntroCover backendStatus={status} onDismiss={onDismiss} />);
    expect(screen.getByText(/WAKING SERVER/i)).toBeInTheDocument();
    expect(screen.queryByText(/~\d+s/)).not.toBeInTheDocument();
    expect(screen.getByText(/choose photos while/i)).toBeInTheDocument();
    const enterBtn = screen.getByRole("button", { name: /swipe up or click to enter/i });
    expect(enterBtn).toBeEnabled();
    fireEvent.click(enterBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("displays server live and enables swipe up gate when online", async () => {
    const onDismiss = vi.fn();
    render(<IntroCover backendStatus="online" onDismiss={onDismiss} />);
    expect(screen.getByText(/SERVER LIVE/i)).toBeInTheDocument();
    const enterBtn = screen.getByRole("button", { name: /swipe up or click to enter/i });
    expect(enterBtn).toBeEnabled();

    await userEvent.click(enterBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("allows dismissing with space key when online", () => {
    const onDismiss = vi.fn();
    render(<IntroCover backendStatus="online" onDismiss={onDismiss} />);

    fireEvent.keyDown(window, { code: "Space" });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("allows dismissing with touch swipe up gesture when online", () => {
    const onDismiss = vi.fn();
    const { container } = render(<IntroCover backendStatus="online" onDismiss={onDismiss} />);
    const overlay = container.querySelector(".intro-overlay");
    expect(overlay).not.toBeNull();

    // Simulate swipe up (touchStart at Y=200, touchMove at Y=120 -> delta -80px)
    fireEvent.touchStart(overlay!, { touches: [{ clientY: 200 }] });
    fireEvent.touchMove(overlay!, { touches: [{ clientY: 120 }] });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("allows dismissing with the keyboard when waking", () => {
    const onDismiss = vi.fn();
    render(<IntroCover backendStatus="waking" onDismiss={onDismiss} />);

    fireEvent.keyDown(window, { code: "Space" });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("keeps the typewriter animation loop alive through a StrictMode mount/cleanup/remount cycle", async () => {
    // Regression guard for a StrictMode-only bug: the effect's cleanup set
    // `cancelled = true` but never reset `isTypingRef.current`. StrictMode's
    // dev-mode mount -> cleanup -> mount sequence would then cancel the
    // first runTypewriter instance (which stops scheduling new animation
    // frames) while the second, real mount saw isTypingRef already true and
    // bailed out before starting a fresh instance -- so no animation frame
    // ever ran again and the headline stayed at width 0.
    //
    // jsdom's requestAnimationFrame callback timestamp isn't on the same
    // clock as performance.now(), so the animation's progress calculation
    // never reaches 1 in tests and it can never visibly finish here. What we
    // *can* verify in jsdom is that the frame loop keeps running at all: a
    // cancelled instance stops calling requestAnimationFrame after its first
    // (already-scheduled) frame, while a live instance reschedules itself on
    // every frame indefinitely.
    const rafSpy = vi.spyOn(window, "requestAnimationFrame");

    render(
      <StrictMode>
        <IntroCover backendStatus="checking" />
      </StrictMode>,
    );

    const callsRightAfterMount = rafSpy.mock.calls.length;
    await new Promise(resolve => setTimeout(resolve, 300));
    const callsAfterDelay = rafSpy.mock.calls.length;

    rafSpy.mockRestore();

    expect(callsAfterDelay).toBeGreaterThan(callsRightAfterMount + 3);
  });
});
