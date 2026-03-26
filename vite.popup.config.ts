import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import babel from "@rolldown/plugin-babel";

export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()]
    }),
    tailwindcss(),
  ],
  publicDir: "public",
  define: {
    "process.env": {},
    "process.env.NODE_ENV": JSON.stringify("production")
  },
  resolve: {
    alias: {
      "@": "/extension/src"
    }
  },
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
        }
      }
    }
  }
});
