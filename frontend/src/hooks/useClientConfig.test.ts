import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import * as api from "../api";
import configSnapshot from "../fixtures/contract/config.json";
import { FALLBACK_CONFIG } from "../constants/config";
import { useClientConfig } from "./useClientConfig";
import type { ClientConfig } from "../types";
import type { BackendAvailability } from "./useBackendAvailability";

describe("useClientConfig", () => {
  it("waits for online, then requests config once", async () => {
    const fetchConfig = vi
      .spyOn(api, "fetchClientConfig")
      .mockResolvedValue(configSnapshot as ClientConfig);
    const { result, rerender } = renderHook(
      ({ availability }) => useClientConfig(availability),
      { initialProps: { availability: "checking" as BackendAvailability } },
    );
    expect(result.current).toEqual({ config: FALLBACK_CONFIG, source: "fallback" });
    expect(fetchConfig).not.toHaveBeenCalled();
    rerender({ availability: "online" });
    await waitFor(() => expect(result.current.source).toBe("server"));
    expect(fetchConfig).toHaveBeenCalledTimes(1);
    rerender({ availability: "online" });
    expect(fetchConfig).toHaveBeenCalledTimes(1);
  });

  it("keeps the fallback when config loading fails", async () => {
    vi.spyOn(api, "fetchClientConfig").mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useClientConfig("online"));
    await act(async () => undefined);
    expect(result.current).toEqual({ config: FALLBACK_CONFIG, source: "fallback" });
  });
});
