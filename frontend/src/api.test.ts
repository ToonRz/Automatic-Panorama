import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockScenario, submitStitch } from "./api";
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
