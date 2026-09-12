import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../api";
import { FALLBACK_CONFIG } from "../constants/config";
import type { StitchResponse } from "../types";
import type { PreparedImage } from "../utils/prepareImage";
import { useStitchRun } from "./useStitchRun";

function fakeFile(name = "a.jpg"): File {
  return new File([new Uint8Array(10)], name, { type: "image/jpeg" });
}

async function prepare(file: File): Promise<PreparedImage> {
  return {
    original: file,
    upload: file,
    uploadName: file.name,
    originalWidth: 16,
    originalHeight: 16,
    uploadWidth: 16,
    uploadHeight: 16,
    resized: false,
  };
}

async function selectFiles(
  result: { current: ReturnType<typeof useStitchRun> },
  files: File[],
) {
  act(() => result.current.setFiles(files));
  if (files.length > 0) {
    await waitFor(() => expect(result.current.state).not.toBe("preparing"));
  }
}

describe("useStitchRun", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts empty, becomes ready at two files, and empty again below that", async () => {
    const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, prepare));
    expect(result.current.state).toBe("empty");

    await selectFiles(result, [fakeFile("a.jpg")]);
    expect(result.current.state).toBe("empty");

    await selectFiles(result, [fakeFile("a.jpg"), fakeFile("b.jpg")]);
    expect(result.current.state).toBe("ready");
  });

  it("enters working while the request is in flight, then complete on success", async () => {
    let resolveSubmit!: (value: StitchResponse) => void;
    vi.spyOn(api, "submitStitch").mockReturnValue(
      new Promise<StitchResponse>((resolve) => {
        resolveSubmit = resolve;
      }),
    );

    const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, prepare));
    await selectFiles(result, [fakeFile("a.jpg"), fakeFile("b.jpg")]);
    act(() => result.current.submit());
    expect(result.current.state).toBe("working");

    const fakeResponse: StitchResponse = {
      status: "complete",
      image: { data_url: "data:image/png;base64,x", mime_type: "image/png", width: 1, height: 1 },
      diagnostics: {
        detector: "SIFT",
        image_count: 2,
        image_order: [0, 1],
        keypoints_per_image: [1, 1],
        ratio_passed_matches_per_pair: [1],
        inliers_per_pair: [1],
        inlier_ratio_per_pair: [1],
        reprojection_error_per_pair: [0.1],
        output_width: 1,
        output_height: 1,
        stage_timings_ms: {},
      },
    };
    resolveSubmit(fakeResponse);
    await waitFor(() => expect(result.current.state).toBe("complete"));
    expect(result.current.result).toEqual(fakeResponse);
    expect(result.current.isStale).toBe(false);
  });

  it("routes a 422 to failed with the error detail", async () => {
    vi.spyOn(api, "submitStitch").mockRejectedValue(
      new api.ApiError(422, { code: "INSUFFICIENT_INLIERS", message: "no agreement" }),
    );
    const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, prepare));
    await selectFiles(result, [fakeFile("a.jpg"), fakeFile("b.jpg")]);
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.state).toBe("failed"));
    expect(result.current.error?.detail.code).toBe("INSUFFICIENT_INLIERS");
  });

  it("marks a completed result stale when a setting changes afterwards, and clears on new settings match", async () => {
    vi.spyOn(api, "submitStitch").mockResolvedValue({
      status: "complete",
      image: { data_url: "x", mime_type: "image/png", width: 1, height: 1 },
      diagnostics: {
        detector: "SIFT",
        image_count: 2,
        image_order: [0, 1],
        keypoints_per_image: [1, 1],
        ratio_passed_matches_per_pair: [1],
        inliers_per_pair: [1],
        inlier_ratio_per_pair: [1],
        reprojection_error_per_pair: [0.1],
        output_width: 1,
        output_height: 1,
        stage_timings_ms: {},
      },
    });
    const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, prepare));
    await selectFiles(result, [fakeFile("a.jpg"), fakeFile("b.jpg")]);
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.state).toBe("complete"));
    expect(result.current.isStale).toBe(false);

    act(() => result.current.setDetector("ORB"));
    expect(result.current.state).toBe("complete");
    expect(result.current.isStale).toBe(true);

    act(() => result.current.setDetector("SIFT"));
    expect(result.current.isStale).toBe(false);
  });

  it("clears the result and error when the file selection changes", async () => {
    vi.spyOn(api, "submitStitch").mockRejectedValue(
      new api.ApiError(422, { code: "INSUFFICIENT_INLIERS", message: "no agreement" }),
    );
    const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, prepare));
    await selectFiles(result, [fakeFile("a.jpg"), fakeFile("b.jpg")]);
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.state).toBe("failed"));

    await selectFiles(result, [fakeFile("c.jpg"), fakeFile("d.jpg")]);
    expect(result.current.state).toBe("ready");
    expect(result.current.error).toBeNull();
  });

  it("does not reset a slider the user touched when server config arrives", () => {
    const { result, rerender } = renderHook(
      ({ config }) => useStitchRun(config, prepare),
      { initialProps: { config: FALLBACK_CONFIG } },
    );
    act(() => result.current.setRatioThreshold(0.82));
    rerender({ config: { ...FALLBACK_CONFIG, ratio_threshold: 0.7 } });
    expect(result.current.ratioThreshold).toBe(0.82);
  });

  it("keeps decode errors in ready and never submits them", async () => {
    const submit = vi.spyOn(api, "submitStitch");
    const rejectText = async (file: File) => {
      if (file.type === "text/plain") throw new Error("decode failed");
      return prepare(file);
    };
    const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, rejectText));
    await selectFiles(result, [
      fakeFile("a.jpg"),
      new File(["notes"], "notes.txt", { type: "text/plain" }),
    ]);
    expect(result.current.state).toBe("ready");
    expect(result.current.hasPreflightErrors).toBe(true);
    expect(result.current.fileErrors[1]).toBe(
      "notes.txt can't be read in this browser. Export it as JPG and add it again.",
    );
    act(() => result.current.submit());
    expect(submit).not.toHaveBeenCalled();
    expect(result.current.state).toBe("ready");
  });

  it("abandons an older preparation when a new selection finishes first", async () => {
    let releaseOld!: () => void;
    const delayed = vi.fn(async (file: File) => {
      if (file.name.startsWith("old")) {
        await new Promise<void>((resolve) => {
          releaseOld = resolve;
        });
      }
      return prepare(file);
    });
    const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, delayed));

    act(() => result.current.setFiles([fakeFile("old-a.jpg"), fakeFile("old-b.jpg")]));
    expect(result.current.state).toBe("preparing");
    await selectFiles(result, [fakeFile("new-a.jpg"), fakeFile("new-b.jpg")]);
    expect(result.current.preparedImages.map((item) => item?.uploadName)).toEqual([
      "new-a.jpg",
      "new-b.jpg",
    ]);

    releaseOld();
    await act(async () => Promise.resolve());
    expect(result.current.files.map((file) => file.name)).toEqual(["new-a.jpg", "new-b.jpg"]);
  });
});

describe("useStitchRun forceDebugState", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_MOCK_API", "true");
  });

  it("forces the failed state using a fixture", async () => {
    const { result } = renderHook(() => useStitchRun());
    await act(async () => {
      result.current.forceDebugState("failed");
    });
    await waitFor(() => expect(result.current.state).toBe("failed"));
    expect(result.current.error?.detail.code).toBe("INSUFFICIENT_INLIERS");
  });

  it("forces the working-cold-start variant with isColdStart already true", () => {
    const { result } = renderHook(() => useStitchRun());
    act(() => result.current.forceDebugState("working-cold-start"));
    expect(result.current.state).toBe("working");
    expect(result.current.isColdStart).toBe(true);
  });
});
