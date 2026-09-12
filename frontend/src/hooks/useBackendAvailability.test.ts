import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "../api";
import { useBackendAvailability } from "./useBackendAvailability";

describe("useBackendAvailability", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("goes online immediately when the first health check succeeds", async () => {
    vi.spyOn(api, "checkHealth").mockResolvedValue(undefined);
    const { result } = renderHook(() => useBackendAvailability());
    expect(result.current).toBe("checking");
    await waitFor(() => expect(result.current).toBe("online"));
  });

  it(
    "moves to waking on the first failure, then settles on offline after bounded retries",
    async () => {
      // Real timers: the backoff (2s, 4s, 8s, 16s ≈ 30s total) is exercised
      // for real rather than fought through fake-timer/microtask ordering,
      // which proved fragile against React's effect scheduling.
      vi.spyOn(api, "checkHealth").mockRejectedValue(new Error("down"));
      const { result } = renderHook(() => useBackendAvailability());

      await waitFor(() => expect(result.current).toBe("waking"));
      await waitFor(() => expect(result.current).toBe("offline"), { timeout: 40_000 });
    },
    45_000,
  );
});
