import { describe, expect, it } from "vitest";

import { argMax, argMin, max, min, sum } from "./stitchStats";

describe("stitchStats", () => {
  it("sums, mins, and maxes a list of numbers", () => {
    expect(sum([1, 2, 3])).toBe(6);
    expect(min([3, 1, 2])).toBe(1);
    expect(max([3, 1, 2])).toBe(3);
  });

  describe("argMin", () => {
    it("returns the index of the smallest value", () => {
      expect(argMin([5, 2, 8])).toBe(1);
    });

    it("returns the first index on a tie", () => {
      expect(argMin([2, 2, 8])).toBe(0);
    });
  });

  describe("argMax", () => {
    it("returns the index of the largest value", () => {
      expect(argMax([5, 2, 8])).toBe(2);
    });

    it("returns the first index on a tie", () => {
      expect(argMax([8, 2, 8])).toBe(0);
    });
  });
});
