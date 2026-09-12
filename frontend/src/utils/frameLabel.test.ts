import { describe, expect, it } from "vitest";

import { frameLabel, framesNamedByError, pairLabel } from "./frameLabel";

const files = [{ name: "IMG_4412.jpg" }, { name: "IMG_4413.jpg" }, { name: "IMG_4414.jpg" }];

describe("frameLabel", () => {
  it("renders the one-based number and file name", () => {
    expect(frameLabel(1, files)).toBe("Frame 2 · IMG_4413.jpg");
  });

  it("falls back to just the number when no file is at that index", () => {
    expect(frameLabel(5, files)).toBe("Frame 6");
  });
});

describe("pairLabel", () => {
  it("names both frames, one-based, with file names", () => {
    expect(pairLabel(0, 1, files)).toBe("Frames 1 · IMG_4412.jpg and 2 · IMG_4413.jpg");
  });
});

describe("framesNamedByError", () => {
  it("returns an empty set when there is no context", () => {
    expect(framesNamedByError({ code: "TOO_FEW_IMAGES", message: "x" }).size).toBe(0);
  });

  it("collects a single image index", () => {
    const indices = framesNamedByError({
      code: "IMAGE_TOO_LARGE",
      message: "x",
      context: { image: 2, size_mb: 18, limit_mb: 12 },
    });
    expect([...indices]).toEqual([2]);
  });

  it("collects both indices of a pair", () => {
    const indices = framesNamedByError({
      code: "INSUFFICIENT_INLIERS",
      message: "x",
      context: { pair: [1, 2], pair_index: 0, inliers: 3, required: 12, inlier_ratio: 0.1 },
    });
    expect([...indices].sort()).toEqual([1, 2]);
  });
});
