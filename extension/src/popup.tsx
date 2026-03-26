import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./../popup.css";
import { App } from "./popup/App";
import { installPopupDevChromeShimIfNeeded } from "./popup/dev/chrome-shim";
import { seedDevLibraryIfEmpty } from "./popup/dev/mock-library-seed";

// Some libraries still reference process.env in browser bundles.
if (typeof Reflect.get(globalThis, "process") === "undefined") {
  Reflect.set(globalThis, "process", { env: { NODE_ENV: "production" } });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Popup root element not found.");
}

void bootstrapPopup(rootElement);

async function bootstrapPopup(container: HTMLElement): Promise<void> {
  const didInstallDevShim = installPopupDevChromeShimIfNeeded();
  if (didInstallDevShim && import.meta.env.DEV) {
    try {
      await seedDevLibraryIfEmpty();
    } catch (error) {
      console.error("Failed to seed popup dev library fixtures:", error);
    }
  }

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
