import { describe, expect, it } from "vitest";

import {
  MOCK_SCENARIOS,
  successWithOverlayFixture,
  successWithoutOverlayFixture,
} from "./index";

describe("fixtures", () => {
  it("keeps overlay geometry consistent with the pair count", () => {
    const pairCount = successWithOverlayFixture.diagnostics.image_count - 1;
    expect(successWithOverlayFixture.diagnostics.seam_lines).toHaveLength(pairCount);
    expect(successWithOverlayFixture.diagnostics.sample_correspondences_per_pair).toHaveLength(
      pairCount,
    );
    for (const samples of successWithOverlayFixture.diagnostics
      .sample_correspondences_per_pair ?? []) {
      expect(samples.length).toBeLessThanOrEqual(12);
    }
  });

  it("gives every seam two distinct endpoints, at least one of them tilted", () => {
    const seams = successWithOverlayFixture.diagnostics.seam_lines ?? [];
    for (const seam of seams) {
      for (const [x, y] of [seam.top, seam.bottom]) {
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
      }
      expect(seam.top[1]).not.toBe(seam.bottom[1]);
    }
    // A fixture whose seams were all vertical would let the overlay read one
    // endpoint and still pass, which is the bug the shape change exists to
    // prevent (docs/backend-spec.md section 8).
    expect(seams.some((seam) => seam.top[0] !== seam.bottom[0])).toBe(true);
  });

  it("omits overlay fields from the no-overlay fixture", () => {
    expect(successWithoutOverlayFixture.diagnostics.seam_lines).toBeUndefined();
    expect(
      successWithoutOverlayFixture.diagnostics.sample_correspondences_per_pair,
    ).toBeUndefined();
  });

  it("carries an unrecognised stage-timing key for the diagnostics chart to render", () => {
    expect(successWithoutOverlayFixture.diagnostics.stage_timings_ms.postprocess).toBeDefined();
  });

  it("has one pair-shaped array per pair in the two-image fixture", () => {
    const pairCount = successWithoutOverlayFixture.diagnostics.image_count - 1;
    expect(successWithoutOverlayFixture.diagnostics.ratio_passed_matches_per_pair).toHaveLength(
      pairCount,
    );
    expect(successWithoutOverlayFixture.diagnostics.inliers_per_pair).toHaveLength(pairCount);
  });

  it("lists every mock scenario exactly once", () => {
    expect(new Set(MOCK_SCENARIOS).size).toBe(MOCK_SCENARIOS.length);
  });
});
