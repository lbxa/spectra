import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "extension/src")
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./extension/src/popup/test/setup.ts"],
    include: ["extension/src/**/*.{test,spec}.{ts,tsx}"]
  }
});
