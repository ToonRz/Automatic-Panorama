import { useEffect, useState } from "react";

import { fetchClientConfig } from "../api";
import { FALLBACK_CONFIG } from "../constants/config";
import type { ClientConfig } from "../types";
import type { BackendAvailability } from "./useBackendAvailability";

export interface ClientConfigState {
  config: ClientConfig;
  source: "fallback" | "server";
}

export function useClientConfig(availability: BackendAvailability): ClientConfigState {
  const [state, setState] = useState<ClientConfigState>({
    config: FALLBACK_CONFIG,
    source: "fallback",
  });

  useEffect(() => {
    if (availability !== "online") return;
    let cancelled = false;
    fetchClientConfig().then(
      (config) => {
        if (!cancelled) setState({ config, source: "server" });
      },
      () => {
        if (!cancelled) setState({ config: FALLBACK_CONFIG, source: "fallback" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [availability]);

  return state;
}
