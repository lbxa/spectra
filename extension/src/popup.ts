const STORAGE_KEY = "components";

type SavedComponent = {
  id: string;
  url: string;
  title: string;
  capturedAt: string;
  html: string;
  screenshotDataUrl: string;
};

type StartCaptureMessage = {
  type: "START_CAPTURE";
};

type SaveComponentResponse = {
  ok: boolean;
  error?: string;
};

const FALLBACK_THUMBNAIL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='130'%3E%3Crect width='100%25' height='100%25' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='52%25' text-anchor='middle' font-size='12' fill='%2364758b' font-family='Arial'%3ENo screenshot%3C/text%3E%3C/svg%3E";

document.addEventListener("DOMContentLoaded", () => {
  const captureButton = document.getElementById("captureButton");
  const statusMessage = document.getElementById("statusMessage");
  const list = document.getElementById("list");
  const emptyState = document.getElementById("emptyState");

  if (
    !(captureButton instanceof HTMLButtonElement) ||
    !(statusMessage instanceof HTMLElement) ||
    !(list instanceof HTMLElement) ||
    !(emptyState instanceof HTMLElement)
  ) {
    return;
  }

  void initializeCaptureAvailability(captureButton, statusMessage);

  captureButton.addEventListener("click", async () => {
    captureButton.disabled = true;
    setStatus(statusMessage, "Starting capture...");

    try {
      const response = (await chrome.runtime.sendMessage({
        type: "START_CAPTURE"
      } satisfies StartCaptureMessage)) as SaveComponentResponse;
      if (!response?.ok) {
        throw new Error(response?.error || "Could not start capture.");
      }
      setStatus(statusMessage, "Capture mode enabled on the active tab.");
      window.close();
    } catch (error) {
      console.error("Failed to start capture:", error);
      setStatus(statusMessage, getCaptureStartErrorMessage(error));
      captureButton.disabled = false;
    }
  });

  void renderItems(list, emptyState, statusMessage);
});

async function initializeCaptureAvailability(
  captureButton: HTMLButtonElement,
  statusMessage: HTMLElement
): Promise<void> {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const supported = isCaptureSupportedUrl(activeTab?.url);
    captureButton.disabled = !supported;
    if (!supported) {
      setStatus(statusMessage, "Capture is unavailable on this page. Open an http(s) page.");
    }
  } catch (error) {
    console.error("Failed to check active tab before capture:", error);
  }
}

async function renderItems(
  list: HTMLElement,
  emptyState: HTMLElement,
  statusMessage: HTMLElement
): Promise<void> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const records = Array.isArray(stored[STORAGE_KEY]) ? (stored[STORAGE_KEY] as unknown[]) : [];
  const validRecords = records.filter(isSavedComponentLike);
  validRecords.sort((a, b) => {
    const left = new Date(a.capturedAt).getTime();
    const right = new Date(b.capturedAt).getTime();
    return right - left;
  });

  list.innerHTML = "";

  if (validRecords.length === 0) {
    emptyState.hidden = false;
    setStatus(statusMessage, "");
    return;
  }

  emptyState.hidden = true;
  setStatus(statusMessage, `${validRecords.length} saved component(s).`);

  for (const record of validRecords) {
    list.appendChild(createCard(record, statusMessage));
  }
}

function createCard(record: SavedComponent, statusMessage: HTMLElement): HTMLElement {
  const card = document.createElement("article");
  card.className = "card";

  const preview = document.createElement("div");
  preview.className = "card__preview";

  const screenshotPanel = document.createElement("figure");
  screenshotPanel.className = "preview-panel";

  const screenshotLabel = document.createElement("figcaption");
  screenshotLabel.className = "preview-panel__label";
  screenshotLabel.textContent = "Screenshot";

  const image = document.createElement("img");
  image.className = "preview-panel__image";
  image.alt = "Captured component thumbnail";
  image.src =
    typeof record.screenshotDataUrl === "string" && record.screenshotDataUrl
      ? record.screenshotDataUrl
      : FALLBACK_THUMBNAIL;

  screenshotPanel.appendChild(screenshotLabel);
  screenshotPanel.appendChild(image);

  const replayPanel = document.createElement("figure");
  replayPanel.className = "preview-panel";

  const replayLabel = document.createElement("figcaption");
  replayLabel.className = "preview-panel__label";
  replayLabel.textContent = "Replay";

  const replayFrame = document.createElement("iframe");
  replayFrame.className = "preview-panel__frame";
  replayFrame.loading = "lazy";
  replayFrame.sandbox.add("allow-same-origin");
  replayFrame.srcdoc = typeof record.html === "string" ? record.html : "";
  replayFrame.title = "Captured component isolated replay";

  replayPanel.appendChild(replayLabel);
  replayPanel.appendChild(replayFrame);

  preview.appendChild(screenshotPanel);
  preview.appendChild(replayPanel);

  const body = document.createElement("div");
  body.className = "card__body";

  const title = document.createElement("h2");
  title.className = "card__title";
  title.textContent =
    typeof record.title === "string" && record.title.trim() ? record.title : "Untitled page";

  const url = document.createElement("p");
  url.className = "card__url";
  url.textContent = typeof record.url === "string" ? record.url : "";

  const timestamp = document.createElement("p");
  timestamp.className = "card__timestamp";
  timestamp.textContent = formatTimestamp(record.capturedAt);

  const actions = document.createElement("div");
  actions.className = "card__actions";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "button button--secondary";
  copyButton.textContent = "Copy HTML";
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(record.html);
      setStatus(statusMessage, "HTML copied.");
    } catch (error) {
      console.error("Failed to copy HTML:", error);
      setStatus(statusMessage, "Copy failed.");
    }
  });

  const copyHtmlCssButton = document.createElement("button");
  copyHtmlCssButton.type = "button";
  copyHtmlCssButton.className = "button button--secondary";
  copyHtmlCssButton.textContent = "Copy HTML + CSS";
  copyHtmlCssButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(record.html);
      setStatus(statusMessage, "HTML + CSS copied.");
    } catch (error) {
      console.error("Failed to copy HTML + CSS:", error);
      setStatus(statusMessage, "Copy failed.");
    }
  });

  actions.appendChild(copyButton);
  actions.appendChild(copyHtmlCssButton);
  body.appendChild(title);
  body.appendChild(url);
  body.appendChild(timestamp);
  body.appendChild(actions);

  card.appendChild(preview);
  card.appendChild(body);
  return card;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Captured time unavailable";
  }
  return `Captured ${date.toLocaleString()}`;
}

function setStatus(node: HTMLElement, message: string): void {
  node.textContent = message;
}

function getCaptureStartErrorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    (error.message.includes("Cannot access a chrome:// URL") ||
      error.message.includes("Capture is not available on this page"))
  ) {
    return "Capture is unavailable on this page. Open an http(s) page.";
  }
  if (error instanceof Error && error.message.includes("too large to save")) {
    return "Captured snapshot is too large to save. Select a smaller element.";
  }
  return "Failed to start capture.";
}

function isCaptureSupportedUrl(url: string | undefined): boolean {
  if (typeof url !== "string" || url.length === 0) {
    return false;
  }
  return url.startsWith("http://") || url.startsWith("https://");
}

function isSavedComponentLike(candidate: unknown): candidate is SavedComponent {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }
  const value = candidate as Partial<SavedComponent>;
  return (
    typeof value.html === "string" &&
    typeof value.url === "string" &&
    typeof value.title === "string" &&
    typeof value.capturedAt === "string"
  );
}
