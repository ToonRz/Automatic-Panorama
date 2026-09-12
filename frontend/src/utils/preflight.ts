import type { ClientConfig } from "../types";

export const CLIENT_MAX_ORIGINAL_MB = 60;
const BYTES_PER_MB = 1024 * 1024;

export interface PreflightResult {
  fileErrors: Array<string | null>;
  totalError: string | null;
  selectionError: string | null;
}

export function validateSelection(files: File[], config: ClientConfig): PreflightResult {
  if (files.length > config.max_upload_files) {
    return {
      fileErrors: [],
      totalError: null,
      selectionError: `Choose up to ${config.max_upload_files} frames. You chose ${files.length}.`,
    };
  }
  return {
    fileErrors: files.map((file) => {
      if (file.size > CLIENT_MAX_ORIGINAL_MB * BYTES_PER_MB) {
        return "Too large to open in the browser.";
      }
      if (!file.type.startsWith("image/")) {
        return `${file.name} can't be read in this browser. Export it as JPG and add it again.`;
      }
      return null;
    }),
    totalError: null,
    selectionError: null,
  };
}

export function validatePreparedFiles(files: Blob[], config: ClientConfig): PreflightResult {
  const perFileLimit = config.max_upload_mb * BYTES_PER_MB;
  const totalLimit = config.max_total_upload_mb * BYTES_PER_MB;
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  return {
    fileErrors: files.map((file) =>
      file.size > perFileLimit
        ? `The prepared file exceeds the ${config.max_upload_mb} MB limit.`
        : null,
    ),
    totalError:
      totalBytes > totalLimit
        ? "The whole upload is over the request limit. Remove a frame or downscale before uploading."
        : null,
    selectionError: null,
  };
}
