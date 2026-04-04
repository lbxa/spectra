import { defineConfig, mergeConfig } from "vite";
import { sharedViteConfig } from "./vite.shared.config";

export default mergeConfig(sharedViteConfig, defineConfig({
  publicDir: "public",
  build: {
    emptyOutDir: false,
    outDir: "dist",
    lib: {
      entry: "extension/src/popup.tsx",
      formats: ["iife"],
      name: "SpectraPopup",
      fileName: () => "popup.js"
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "popup.css";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
}));
