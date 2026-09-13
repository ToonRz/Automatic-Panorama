import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const fetchClientConfig = vi.fn().mockRejectedValue(new Error("use fallback"));

vi.mock("./api", () => ({
  checkHealth: vi.fn().mockResolvedValue(undefined),
  fetchClientConfig: (...args: unknown[]) => fetchClientConfig(...args),
  submitStitch: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

import App from "./App";
import { FALLBACK_CONFIG } from "./constants/config";

describe("App smoke test", () => {
  it("renders without crashing, proving the test harness works", async () => {
    render(<App />);
    expect(await screen.findByText(/Automatic Panorama Stitcher/i)).toBeInTheDocument();
  });

  it("reads the lede's frame-count range from the fallback config", async () => {
    render(<App />);
    expect(
      await screen.findByText(`Upload 2–${FALLBACK_CONFIG.max_upload_files} frames in capture order. Every seam comes with the evidence behind it.`),
    ).toBeInTheDocument();
  });

  it("reads the lede's upper bound from a server-provided config (10b)", async () => {
    fetchClientConfig.mockResolvedValueOnce({ ...FALLBACK_CONFIG, max_upload_files: 6 });
    render(<App />);
    expect(await screen.findByText(/Upload 2–6 frames/)).toBeInTheDocument();
  });
});
