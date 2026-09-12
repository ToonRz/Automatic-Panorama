import type { ApiErrorDetail, StitchOptions, StitchResponse } from "./types";

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

export async function checkHealth(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/healthz`);
  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }
}

export async function submitStitch(
  files: File[],
  options: StitchOptions,
): Promise<StitchResponse> {
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
