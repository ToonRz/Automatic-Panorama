import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../api";
import { STITCH_REQUEST_TIMEOUT_MS } from "../constants/availability";
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

  it("counts down a SERVICE_BUSY rejection and re-enables at zero, sending no request meanwhile (I11)", async () => {
    vi.useFakeTimers();
    try {
      const submit = vi.spyOn(api, "submitStitch").mockRejectedValue(
        new api.ApiError(429, {
          code: "SERVICE_BUSY",
          message: "busy",
          context: { retry_after_seconds: 2 },
        }),
      );
      const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, prepare));
      await act(async () => {
        result.current.setFiles([fakeFile("a.jpg"), fakeFile("b.jpg")]);
        await vi.runAllTimersAsync();
      });
      act(() => result.current.submit());
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      expect(result.current.state).toBe("failed");
      expect(result.current.busySecondsLeft).toBe(2);
      expect(submit).toHaveBeenCalledTimes(1);

      await act(async () => vi.advanceTimersByTimeAsync(1_000));
      expect(result.current.busySecondsLeft).toBe(1);

      act(() => result.current.submit());
      expect(submit).toHaveBeenCalledTimes(1);

      await act(async () => vi.advanceTimersByTimeAsync(1_000));
      expect(result.current.busySecondsLeft).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("classifies a rejected fetch as SERVER_UNREACHABLE while the pill is not online", async () => {
    vi.spyOn(api, "submitStitch").mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, prepare, "waking"));
    await selectFiles(result, [fakeFile("a.jpg"), fakeFile("b.jpg")]);
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.state).toBe("failed"));
    expect(result.current.error?.detail.code).toBe("SERVER_UNREACHABLE");
  });

  it("classifies a rejected fetch as NETWORK_ERROR while the pill is online", async () => {
    vi.spyOn(api, "submitStitch").mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, prepare, "online"));
    await selectFiles(result, [fakeFile("a.jpg"), fakeFile("b.jpg")]);
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.state).toBe("failed"));
    expect(result.current.error?.detail.code).toBe("NETWORK_ERROR");
  });

  it("aborts a request that never resolves after STITCH_REQUEST_TIMEOUT_MS and lands on REQUEST_TIMEOUT (I12)", async () => {
    expect(STITCH_REQUEST_TIMEOUT_MS).toBe(120_000);
    vi.useFakeTimers();
    try {
      vi.spyOn(api, "submitStitch").mockImplementation(
        (_files, _options, signal?: AbortSignal) =>
          new Promise((_resolve, reject) => {
            signal?.addEventListener("abort", () => reject(new DOMException("", "AbortError")));
          }),
      );
      const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, prepare));
      await act(async () => {
        result.current.setFiles([fakeFile("a.jpg"), fakeFile("b.jpg")]);
        await vi.runAllTimersAsync();
      });
      act(() => result.current.submit());
      expect(result.current.state).toBe("working");

      await act(async () => vi.advanceTimersByTimeAsync(STITCH_REQUEST_TIMEOUT_MS));
      expect(result.current.state).toBe("failed");
      expect(result.current.error?.detail.code).toBe("REQUEST_TIMEOUT");
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancel returns to ready with files and settings intact, and shows the note (I13)", async () => {
    let rejectSubmit!: (reason: unknown) => void;
    vi.spyOn(api, "submitStitch").mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectSubmit = reject;
      }),
    );
    const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, prepare));
    await selectFiles(result, [fakeFile("a.jpg"), fakeFile("b.jpg")]);
    act(() => result.current.setDetector("ORB"));
    act(() => result.current.submit());
    expect(result.current.state).toBe("working");

    act(() => result.current.cancel());
    expect(result.current.state).toBe("ready");
    expect(result.current.files).toHaveLength(2);
    expect(result.current.detector).toBe("ORB");
    expect(result.current.cancelledNote).toMatch(/cancelled/i);

    // A late rejection (the abort settling, or the server finishing anyway)
    // must not resurrect the cancelled request.
    act(() => rejectSubmit(new DOMException("", "AbortError")));
    expect(result.current.state).toBe("ready");
  });

  it("clears the cancelled note on the next submit", async () => {
    let rejectSubmit!: (reason: unknown) => void;
    vi.spyOn(api, "submitStitch").mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectSubmit = reject;
        }),
    );
    const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, prepare));
    await selectFiles(result, [fakeFile("a.jpg"), fakeFile("b.jpg")]);
    act(() => result.current.submit());
    act(() => result.current.cancel());
    expect(result.current.cancelledNote).not.toBeNull();

    act(() => result.current.submit());
    expect(result.current.cancelledNote).toBeNull();
    rejectSubmit(new Error("cleanup"));
  });

  it("a late 200 after cancel does not overwrite the ready state", async () => {
    let resolveSubmit!: (value: StitchResponse) => void;
    vi.spyOn(api, "submitStitch").mockReturnValue(
      new Promise((resolve) => {
        resolveSubmit = resolve;
      }),
    );
    const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, prepare));
    await selectFiles(result, [fakeFile("a.jpg"), fakeFile("b.jpg")]);
    act(() => result.current.submit());
    act(() => result.current.cancel());
    expect(result.current.state).toBe("ready");

    act(() =>
      resolveSubmit({
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
      }),
    );
    expect(result.current.state).toBe("ready");
    expect(result.current.result).toBeNull();
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

describe("useStitchRun addFiles / removeFile", () => {
  async function settle(result: { current: ReturnType<typeof useStitchRun> }) {
    await waitFor(() => expect(result.current.state).not.toBe("preparing"));
  }

  it("appends a later pick instead of replacing the selection", async () => {
    const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, prepare));
    act(() => result.current.addFiles([fakeFile("a.jpg")]));
    await settle(result);
    expect(result.current.state).toBe("empty");

    act(() => result.current.addFiles([fakeFile("b.jpg"), fakeFile("c.jpg")]));
    await settle(result);
    expect(result.current.files.map((file) => file.name)).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
    expect(result.current.preparedImages).toHaveLength(3);
    expect(result.current.state).toBe("ready");
  });

  it("rejects an append over the count limit and keeps the previous selection", async () => {
    const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, prepare));
    const max = FALLBACK_CONFIG.max_upload_files;
    act(() => result.current.addFiles(Array.from({ length: max }, (_, i) => fakeFile(`${i}.jpg`))));
    await settle(result);

    act(() => result.current.addFiles([fakeFile("extra.jpg")]));
    expect(result.current.selectionError).toBe(
      `Choose up to ${max} frames. You chose ${max + 1}.`,
    );
    expect(result.current.files).toHaveLength(max);
  });

  it("removes one frame and re-prepares the rest", async () => {
    const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, prepare));
    act(() => result.current.addFiles([fakeFile("a.jpg"), fakeFile("b.jpg"), fakeFile("c.jpg")]));
    await settle(result);

    act(() => result.current.removeFile(1));
    await settle(result);
    expect(result.current.files.map((file) => file.name)).toEqual(["a.jpg", "c.jpg"]);
    expect(result.current.preparedImages.map((item) => item?.uploadName)).toEqual([
      "a.jpg",
      "c.jpg",
    ]);
  });

  it("resets all files, results, and returns to empty state", async () => {
    const { result } = renderHook(() => useStitchRun(FALLBACK_CONFIG, prepare));
    act(() => result.current.addFiles([fakeFile("a.jpg"), fakeFile("b.jpg")]));
    await settle(result);
    expect(result.current.state).toBe("ready");
    expect(result.current.files).toHaveLength(2);

    act(() => result.current.reset());
    expect(result.current.state).toBe("empty");
    expect(result.current.files).toHaveLength(0);
    expect(result.current.result).toBeNull();
  });
});
