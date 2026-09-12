import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(currentDir, "../..");

/**
 * Markers that only ever originate from mock-mode-only code (the fixtures
 * module and the dev state switcher), never from a production code path.
 * Codes such as INSUFFICIENT_INLIERS legitimately ship in the production
 * bundle via the remedy table, so they are not used as markers here.
 */
const MOCK_ONLY_MARKERS = [
  "Mock state",
  "Frames loaded",
  "EXOTIC_FAILURE_MODE",
  "IMG_4415.jpg",
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
];

describe("production build (A12)", () => {
  it("excludes the mock state switcher and fixtures when VITE_MOCK_API is unset", () => {
    const outDir = mkdtempSync(path.join(tmpdir(), "panorama-build-"));
    try {
      const env = { ...process.env };
      delete env.VITE_MOCK_API;

      execFileSync("npx", ["vite", "build", "--outDir", outDir, "--emptyOutDir"], {
        cwd: frontendRoot,
        env,
        stdio: "pipe",
      });

      const assetsDir = path.join(outDir, "assets");
      const bundleFiles = readdirSync(assetsDir).filter((file: string) => file.endsWith(".js"));
      expect(bundleFiles.length).toBeGreaterThan(0);

      const bundleText = bundleFiles
        .map((file: string) => readFileSync(path.join(assetsDir, file), "utf8"))
        .join("\n");

      for (const marker of MOCK_ONLY_MARKERS) {
        expect(bundleText).not.toContain(marker);
      }
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
