import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (command === "build" && mode === "production" && env.VITE_MOCK_API === "true") {
    throw new Error("Production builds must not enable VITE_MOCK_API.");
  }

  return {
    define: {
      "import.meta.env.VITE_MOCK_API": JSON.stringify(mode === "mock" ? "true" : "false"),
    },
    plugins: [react()],
    server: {
      port: 5173,
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
      testTimeout: 60_000,
    },
  };
});
