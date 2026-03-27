import { defineConfig, mergeConfig } from "vite";
import { sharedViteConfig } from "./vite.shared.config";

export default mergeConfig(sharedViteConfig, defineConfig({
  build: {
    emptyOutDir: false,
    outDir: "dist",
    lib: {
      entry: "extension/src/preview-runtime.ts",
      formats: ["iife"],
      name: "SpectraPreviewRuntime",
      fileName: () => "preview-runtime.js",
      cssFileName: "preview-runtime",
    },
  },
}));
