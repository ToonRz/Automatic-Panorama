import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
  checkHealth: vi.fn().mockResolvedValue(undefined),
  fetchClientConfig: vi.fn().mockRejectedValue(new Error("use fallback")),
  submitStitch: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

import App from "./App";

describe("App smoke test", () => {
  it("renders without crashing, proving the test harness works", async () => {
    render(<App />);
    expect(await screen.findByText(/Automatic Panorama Stitcher/i)).toBeInTheDocument();
  });
});
