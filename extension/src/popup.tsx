import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./../popup.css";
import { App } from "./popup/App";
import { installPopupDevChromeShimIfNeeded } from "./popup/dev/chrome-shim";

// Some libraries still reference process.env in browser bundles.
if (typeof Reflect.get(globalThis, "process") === "undefined") {
  Reflect.set(globalThis, "process", { env: { NODE_ENV: "production" } });
}

installPopupDevChromeShimIfNeeded();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Popup root element not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
