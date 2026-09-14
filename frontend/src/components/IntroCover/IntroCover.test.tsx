import { render, screen, fireEvent, act } from "@testing-library/react";
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

  it("displays starting backend cold start state while waking", () => {
    render(<IntroCover backendStatus="waking" />);
    expect(screen.getByText(/STARTING BACKEND/i)).toBeInTheDocument();
    expect(screen.getByText(/Cold start/i)).toBeInTheDocument();
    const enterBtn = screen.getByRole("button", { name: /swipe up or click to enter/i });
    expect(enterBtn).toBeDisabled();
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

  it("does not allow dismissing when waking", () => {
    const onDismiss = vi.fn();
    render(<IntroCover backendStatus="waking" onDismiss={onDismiss} />);

    fireEvent.keyDown(window, { code: "Space" });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
