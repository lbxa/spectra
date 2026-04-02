import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import babel from "@rolldown/plugin-babel";

export const sharedViteConfig = defineConfig({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
  ],
  define: {
    "process.env": {},
    "process.env.NODE_ENV": JSON.stringify("production"),
    __DEBUG__: JSON.stringify(process.env.SPECTRA_DEBUG === "true"),
  },
  resolve: {
    alias: {
      "@": "/extension/src",
    },
  },
});
