import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

Object.defineProperty(globalThis, "createImageBitmap", {
  configurable: true,
  value: async () => ({ width: 16, height: 16, close() {} }),
});

afterEach(() => {
  cleanup();
});
