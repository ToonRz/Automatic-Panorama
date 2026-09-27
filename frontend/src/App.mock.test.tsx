import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return { ...actual, checkHealth: vi.fn().mockResolvedValue(undefined) };
});

import App from "./App";

/**
 * Exercises every state in docs/ui-spec.md section 4 (plus the cold-start
 * variant) through the dev-only switcher, proving A1: each renders its own
 * screen with no two visible at once.
 */
describe("App with the mock switcher (VITE_MOCK_API=true)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_MOCK_API", "true");
  });

  it("renders the state switcher and each state exclusively", async () => {
    const user = userEvent.setup();
    render(<App />);

    const group = screen.getByRole("group", { name: /mock state/i });
    expect(group).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Empty" }));
    expect(screen.getByText(/the panorama lands here/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add two frames to start/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Frames loaded" }));
    expect(screen.getByRole("button", { name: /stitch panorama/i })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Preparing" }));
    expect(screen.getByRole("button", { name: /preparing images/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Stitching" }));
    expect(screen.getByText("Decode")).toBeInTheDocument();
    expect(screen.queryByText(/waking up/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Stitching (cold start)" }));
    expect(screen.getByText(/waking up/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Complete" }));
    expect(await screen.findByAltText(/stitched panorama/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rejected" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("labels the funnel's ratio test with the threshold the result ran at, not the live slider (G3)", async () => {
    const user = userEvent.setup();
    render(<App />);

    const slider = screen.getByLabelText("Lowe ratio test");
    fireEvent.change(slider, { target: { value: "0.8" } });
    await user.click(screen.getByRole("button", { name: "Complete" }));
    expect(await screen.findByText(/≤ 0\.80/)).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: "0.85" } });
    expect(screen.getByText(/≤ 0\.80/)).toBeInTheDocument();
    expect(screen.queryByText(/≤ 0\.85/)).not.toBeInTheDocument();
  });
});
