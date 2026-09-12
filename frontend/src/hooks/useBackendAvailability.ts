import { useEffect, useState } from "react";

import { checkHealth } from "../api";
import {
  HEALTH_RETRY_BASE_DELAY_MS,
  HEALTH_RETRY_MAX_ATTEMPTS,
  HEALTH_RETRY_MAX_DELAY_MS,
} from "../constants/availability";

export type BackendAvailability = "checking" | "waking" | "online" | "offline";

/**
 * docs/ui-spec.md section 9. Health is requested once at page load (the
 * warm-up ping), then retried with a bounded exponential backoff while the
 * pill reads "waking"; retries stop after HEALTH_RETRY_MAX_ATTEMPTS and the
 * pill settles on "offline".
 */
export function useBackendAvailability(): BackendAvailability {
  const [status, setStatus] = useState<BackendAvailability>("checking");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    function attemptCheck() {
      checkHealth()
        .then(() => {
          if (!cancelled) setStatus("online");
        })
        .catch(() => {
          if (cancelled) return;
          attempt += 1;
          if (attempt >= HEALTH_RETRY_MAX_ATTEMPTS) {
            setStatus("offline");
            return;
          }
          setStatus("waking");
          const delay = Math.min(
            HEALTH_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
            HEALTH_RETRY_MAX_DELAY_MS,
          );
          timer = setTimeout(attemptCheck, delay);
        });
    }

    attemptCheck();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return status;
}
