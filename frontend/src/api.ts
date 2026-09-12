import { HEALTH_CHECK_TIMEOUT_MS } from "./constants/availability";
import type { ApiErrorDetail, StitchOptions, StitchResponse } from "./types";
import type { MockScenario } from "./fixtures";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

export class ApiError extends Error {
  readonly status: number;
  readonly detail: ApiErrorDetail | undefined;

  constructor(status: number, detail: ApiErrorDetail | undefined) {
    super(detail?.message ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function parseError(response: Response): Promise<ApiErrorDetail | undefined> {
  const payload: unknown = await response.json().catch(() => undefined);
  if (!payload || typeof payload !== "object" || !("detail" in payload)) {
    return undefined;
  }
  const detail = payload.detail;
  if (!detail || typeof detail !== "object" || !("code" in detail) || !("message" in detail)) {
    return undefined;
  }
  return detail as ApiErrorDetail;
}

/**
 * Mock mode (docs/ui-spec.md section 10). Off by default; a client that
 * builds with `VITE_MOCK_API` unset or not exactly `"true"` never reaches
 * the branches below, so bundlers dead-code-eliminate the dynamic fixture
 * import and it never ships in a production build.
 */
export function isMockApiEnabled(): boolean {
  return import.meta.env.VITE_MOCK_API === "true";
}

let mockScenario: MockScenario = "success-with-overlay";

export function setMockScenario(scenario: MockScenario): void {
  mockScenario = scenario;
}

export function getMockScenario(): MockScenario {
  return mockScenario;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkHealth(): Promise<void> {
  if (isMockApiEnabled()) {
    await delay(120);
    return;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/healthz`, { signal: controller.signal });
    if (!response.ok) {
      throw new ApiError(response.status, await parseError(response));
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function submitStitch(
  files: File[],
  options: StitchOptions,
): Promise<StitchResponse> {
  if (isMockApiEnabled()) {
    return submitStitchMock();
  }

  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  form.append("detector", options.detector);
  form.append("ratio_threshold", String(options.ratioThreshold));
  form.append("ransac_reproj_threshold", String(options.ransacReprojThreshold));

  const response = await fetch(`${API_BASE_URL}/api/v1/stitch`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }
  return (await response.json()) as StitchResponse;
}

async function submitStitchMock(): Promise<StitchResponse> {
  const fixtures = await import("./fixtures");
  await delay(500);

  switch (mockScenario) {
    case "success-with-overlay":
      return structuredClone(fixtures.successWithOverlayFixture);
    case "success-without-overlay":
      return structuredClone(fixtures.successWithoutOverlayFixture);
    case "insufficient-inliers":
      throw new ApiError(
        fixtures.insufficientInliersError.status,
        fixtures.insufficientInliersError.detail,
      );
    case "image-too-large":
      throw new ApiError(fixtures.imageTooLargeError.status, fixtures.imageTooLargeError.detail);
    case "unrecognized-code":
      throw new ApiError(
        fixtures.unrecognizedCodeError.status,
        fixtures.unrecognizedCodeError.detail,
      );
    case "pipeline-not-implemented":
      throw new ApiError(
        fixtures.pipelineNotImplementedFixture.status,
        fixtures.pipelineNotImplementedFixture.detail,
      );
    default: {
      const exhaustive: never = mockScenario;
      throw new Error(`Unhandled mock scenario: ${String(exhaustive)}`);
    }
  }
}
