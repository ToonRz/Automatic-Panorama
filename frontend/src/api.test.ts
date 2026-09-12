import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchClientConfig, setMockScenario, submitStitch } from "./api";
import { FALLBACK_CONFIG } from "./constants/config";
import {
  imageTooLargeError,
  insufficientInliersError,
  successWithOverlayFixture,
  successWithoutOverlayFixture,
  unrecognizedCodeError,
} from "./fixtures";

const options = { detector: "SIFT" as const, ratioThreshold: 0.75, ransacReprojThreshold: 5 };

describe("submitStitch in mock mode", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_MOCK_API", "true");
  });

  it("returns the overlay success fixture without touching the network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    setMockScenario("success-with-overlay");
    const result = await submitStitch([], options);
    expect(result).toEqual(successWithOverlayFixture);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the no-overlay success fixture", async () => {
    setMockScenario("success-without-overlay");
    const result = await submitStitch([], options);
    expect(result).toEqual(successWithoutOverlayFixture);
  });

  it("rejects with the insufficient-inliers fixture", async () => {
    setMockScenario("insufficient-inliers");
    await expect(submitStitch([], options)).rejects.toMatchObject({
      status: insufficientInliersError.status,
      detail: insufficientInliersError.detail,
    });
  });

  it("rejects with the image-too-large fixture", async () => {
    setMockScenario("image-too-large");
    await expect(submitStitch([], options)).rejects.toMatchObject({
      status: imageTooLargeError.status,
      detail: imageTooLargeError.detail,
    });
  });

  it("rejects with an unrecognised code fixture", async () => {
    setMockScenario("unrecognized-code");
    await expect(submitStitch([], options)).rejects.toMatchObject({
      status: unrecognizedCodeError.status,
      detail: unrecognizedCodeError.detail,
    });
  });
});

describe("submitStitch against the real API (docs/integration-spec.md section 7.2)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("maps a 502 with no JSON envelope to UPSTREAM_UNAVAILABLE", async () => {
    vi.stubEnv("VITE_MOCK_API", "false");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>Bad Gateway</html>", { status: 502 }),
    );
    await expect(submitStitch([], options)).rejects.toMatchObject({
      status: 502,
      detail: { code: "UPSTREAM_UNAVAILABLE" },
    });
  });

  it("maps any other envelope-less error response to UNKNOWN_ERROR", async () => {
    vi.stubEnv("VITE_MOCK_API", "false");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("oops", { status: 500 }));
    await expect(submitStitch([], options)).rejects.toMatchObject({
      status: 500,
      detail: { code: "UNKNOWN_ERROR" },
    });
  });

  it("keeps the backend's own envelope when present", async () => {
    vi.stubEnv("VITE_MOCK_API", "false");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: { code: "UNEXPECTED_ERROR", message: "boom" } }), {
        status: 500,
      }),
    );
    await expect(submitStitch([], options)).rejects.toMatchObject({
      status: 500,
      detail: { code: "UNEXPECTED_ERROR", message: "boom" },
    });
  });
});

describe("fetchClientConfig", () => {
  it("returns fallback policy without a network call in mock mode", async () => {
    vi.stubEnv("VITE_MOCK_API", "true");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(fetchClientConfig()).resolves.toEqual(FALLBACK_CONFIG);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
