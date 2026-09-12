/**
 * Render Free suspends an idle service. These bounds drive the health-check
 * retry loop (docs/ui-spec.md section 9) and the in-flight cold-start notice.
 */
export const COLD_START_THRESHOLD_MS = 12_000;

export const HEALTH_CHECK_TIMEOUT_MS = 8_000;
export const HEALTH_RETRY_MAX_ATTEMPTS = 5;
export const HEALTH_RETRY_BASE_DELAY_MS = 2_000;
export const HEALTH_RETRY_MAX_DELAY_MS = 20_000;
