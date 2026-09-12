import { describe, expect, it } from "vitest";

import { FALLBACK_CONFIG } from "../constants/config";
import { validatePreparedFiles, validateSelection } from "./preflight";

function file(name: string, size: number, type = "image/jpeg"): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("pre-flight validation", () => {
  it("rejects the whole over-count selection with the configured limit", () => {
    const config = { ...FALLBACK_CONFIG, max_upload_files: 5 };
    const files = Array.from({ length: 6 }, (_, index) => file(`${index}.jpg`, 1));
    expect(validateSelection(files, config).selectionError).toBe(
      "Choose up to 5 frames. You chose 6.",
    );
  });

  it("rejects an over-60 MB original before attempting browser decode", () => {
    const result = validateSelection(
      [file("huge.jpg", 60 * 1024 * 1024 + 1)],
      FALLBACK_CONFIG,
    );
    expect(result.fileErrors[0]).toBe("Too large to open in the browser.");
  });

  it("uses prepared byte sizes for per-file and total checks", () => {
    const config = { ...FALLBACK_CONFIG, max_upload_mb: 1, max_total_upload_mb: 1 };
    const result = validatePreparedFiles([file("a.jpg", 600_000), file("b.jpg", 600_000)], config);
    expect(result.fileErrors).toEqual([null, null]);
    expect(result.totalError).toMatch(/whole upload is over the request limit/i);
  });
});
