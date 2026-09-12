/**
 * Render Free suspends an idle service. These bounds drive the health-check
 * retry loop (docs/ui-spec.md section 9) and the in-flight cold-start notice.
 */
export const COLD_START_THRESHOLD_MS = 12_000;

export const HEALTH_CHECK_TIMEOUT_MS = 8_000;
export const HEALTH_RETRY_MAX_ATTEMPTS = 5;
export const HEALTH_RETRY_BASE_DELAY_MS = 2_000;
export const HEALTH_RETRY_MAX_DELAY_MS = 20_000;

/**
 * docs/integration-spec.md section 8.1: the client's own bound on a stitch
 * request, since a sleeping Render instance can otherwise hang with no
 * explanation. `stitch_timeout_seconds` is not published in `/config`, so
 * the server-side term is a named constant here, not a literal.
 */
export const COLD_START_ALLOWANCE_MS = 45_000;
export const SERVER_STITCH_TIMEOUT_MS = 60_000;
export const RESPONSE_MARGIN_MS = 15_000;
export const STITCH_REQUEST_TIMEOUT_MS =
  COLD_START_ALLOWANCE_MS + SERVER_STITCH_TIMEOUT_MS + RESPONSE_MARGIN_MS;
