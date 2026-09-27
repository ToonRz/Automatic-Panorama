import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(currentDir, "../..");

/**
 * Vite's CLI entry, run through the current Node binary. Spawning "npx"
 * directly fails on Windows (it is npx.cmd, which execFileSync cannot launch
 * without a shell). "vite/bin/vite.js" is not in Vite's package exports, so
 * the path comes from the "bin" field of its package.json instead.
 */
function resolveViteBin(): string {
  const requireFromFrontend = createRequire(path.join(frontendRoot, "package.json"));
  const vitePackageJson = requireFromFrontend.resolve("vite/package.json");
  const { bin } = JSON.parse(readFileSync(vitePackageJson, "utf8")) as {
    bin: string | Record<string, string>;
  };
  const binPath = typeof bin === "string" ? bin : bin.vite;
  return path.resolve(path.dirname(vitePackageJson), binPath);
}

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

      execFileSync(
        process.execPath,
        [resolveViteBin(), "build", "--outDir", outDir, "--emptyOutDir"],
        {
          cwd: frontendRoot,
          env,
          stdio: "pipe",
        },
      );

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
