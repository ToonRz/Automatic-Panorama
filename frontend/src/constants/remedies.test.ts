import { describe, expect, it } from "vitest";

import type { ApiErrorDetail } from "../types";
import { FALLBACK_CONFIG } from "./config";
import { GENERIC_REMEDY, headingForError, remedyForCode } from "./remedies";

describe("remedyForCode", () => {
  it("returns the generic remedy for an unrecognised code", () => {
    expect(remedyForCode({ code: "SOME_FUTURE_CODE", message: "x" })).toBe(GENERIC_REMEDY);
  });

  it("returns remedy text for every live and owed code in the section 7.1 table, and every client-reachable code in section 7.2", () => {
    const codes = [
      // docs/backend-spec.md section 9
      "TOO_FEW_IMAGES",
      "TOO_MANY_IMAGES",
      "INVALID_STITCH_SETTINGS",
      "UNSUPPORTED_IMAGE_TYPE",
      "EMPTY_IMAGE",
      "IMAGE_TOO_LARGE",
      "TOTAL_UPLOAD_TOO_LARGE",
      "SERVICE_BUSY",
      "STITCH_TIMEOUT",
      "DECODE_FAILED",
      "IMAGE_TOO_MANY_PIXELS",
      "NO_DESCRIPTORS",
      "INSUFFICIENT_MATCHES",
      "INSUFFICIENT_INLIERS",
      "DEGENERATE_HOMOGRAPHY",
      "DISCONNECTED_IMAGES",
      "CANVAS_TOO_LARGE",
      // docs/integration-spec.md section 7.2
      "UNEXPECTED_ERROR",
      "NETWORK_ERROR",
      "SERVER_UNREACHABLE",
      "UPSTREAM_UNAVAILABLE",
      "UNKNOWN_ERROR",
      "REQUEST_TIMEOUT",
    ];
    for (const code of codes) {
      const remedy = remedyForCode({ code, message: "x" });
      expect(remedy.length).toBeGreaterThan(0);
      expect(remedy).not.toBe(GENERIC_REMEDY);
    }
  });

  it("uses the server-configured frame limit", () => {
    expect(
      remedyForCode(
        { code: "TOO_MANY_IMAGES", message: "x" },
        { ...FALLBACK_CONFIG, max_upload_files: 5 },
      ),
    ).toEqual(["Remove frames until 5 or fewer remain."]);
  });
});

describe("headingForError", () => {
  it("names both frames for a pair-identifying code, one-based, without files", () => {
    const detail: ApiErrorDetail = {
      code: "INSUFFICIENT_INLIERS",
      message: "x",
      context: { pair: [1, 2], pair_index: 1, inliers: 5, required: 12 },
    };
    expect(headingForError(detail)).toBe("Frames 2 and 3 do not agree");
  });

  it("names both frames and their file names for a pair-identifying code", () => {
    const detail: ApiErrorDetail = {
      code: "INSUFFICIENT_INLIERS",
      message: "x",
      context: { pair: [0, 1], pair_index: 0, inliers: 5, required: 12 },
    };
    const files = [{ name: "IMG_4412.jpg" }, { name: "IMG_4413.jpg" }];
    expect(headingForError(detail, files)).toBe(
      "Frames 1 · IMG_4412.jpg and 2 · IMG_4413.jpg do not agree",
    );
  });

  it("names a single frame for an image-identifying code, one-based", () => {
    const detail: ApiErrorDetail = {
      code: "IMAGE_TOO_LARGE",
      message: "x",
      context: { image: 3, size_mb: 18.4, limit_mb: 12 },
    };
    expect(headingForError(detail)).toBe("Frame 4 is too large");
  });

  it("names a single frame and its file name for an image-identifying code", () => {
    const detail: ApiErrorDetail = {
      code: "IMAGE_TOO_LARGE",
      message: "x",
      context: { image: 1, size_mb: 18.4, limit_mb: 12 },
    };
    const files = [{ name: "a.jpg" }, { name: "b.jpg" }];
    expect(headingForError(detail, files)).toBe("Frame 2 · b.jpg is too large");
  });

  it("uses a standalone sentence for a code with no per-image context", () => {
    const detail: ApiErrorDetail = { code: "TOO_FEW_IMAGES", message: "x" };
    expect(headingForError(detail)).toBe("Not enough frames");
  });

  it("falls back to the generic heading for an unrecognised code", () => {
    const detail: ApiErrorDetail = { code: "EXOTIC_FAILURE_MODE", message: "x" };
    expect(headingForError(detail)).toBe("Could not stitch these frames");
  });
});
