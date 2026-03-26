type DevMessageListener = (message: unknown) => void;

const DEV_STORAGE_KEY = "__spectra_dev_chrome_storage__";

export function installPopupDevChromeShimIfNeeded(): void {
  if (hasExtensionPopupApis()) {
    return;
  }
  installPopupDevChromeShim();
}

function hasExtensionPopupApis(): boolean {
  const chromeObject = Reflect.get(globalThis, "chrome");
  if (!isRecord(chromeObject)) {
    return false;
  }
  return (
    isRecord(chromeObject.runtime) &&
    typeof chromeObject.runtime.sendMessage === "function" &&
    isRecord(chromeObject.runtime.onMessage) &&
    typeof chromeObject.runtime.onMessage.addListener === "function" &&
    typeof chromeObject.runtime.onMessage.removeListener === "function" &&
    isRecord(chromeObject.tabs) &&
    typeof chromeObject.tabs.query === "function" &&
    isRecord(chromeObject.storage) &&
    isRecord(chromeObject.storage.local) &&
    typeof chromeObject.storage.local.get === "function" &&
    typeof chromeObject.storage.local.set === "function"
  );
}

function installPopupDevChromeShim(): void {
  const messageListeners = new Set<DevMessageListener>();

  Reflect.set(globalThis, "chrome", {
    runtime: {
      async sendMessage(message: unknown): Promise<unknown> {
        for (const listener of messageListeners) {
          listener(message);
        }
        if (isRecord(message) && message.type === "START_CAPTURE") {
          return {
            ok: false,
            error: "Capture is unavailable in localhost popup dev mode."
          };
        }
        return { ok: true };
      },
      onMessage: {
        addListener(listener: DevMessageListener): void {
          messageListeners.add(listener);
        },
        removeListener(listener: DevMessageListener): void {
          messageListeners.delete(listener);
        }
      }
    },
    tabs: {
      async query(): Promise<Array<{ active: boolean; lastFocusedWindow: boolean; url: string }>> {
        return [
          {
            active: true,
            lastFocusedWindow: true,
            url: window.location.href
          }
        ];
      }
    },
    storage: {
      local: {
        async get(keys?: unknown): Promise<Record<string, unknown>> {
          const state = readDevStorageState();
          if (typeof keys === "string") {
            return { [keys]: state[keys] };
          }
          if (Array.isArray(keys)) {
            const result: Record<string, unknown> = {};
            for (const key of keys) {
              if (typeof key === "string") {
                result[key] = state[key];
              }
            }
            return result;
          }
          if (isRecord(keys)) {
            return { ...keys, ...state };
          }
          return state;
        },
        async set(nextValues: Record<string, unknown>): Promise<void> {
          const current = readDevStorageState();
          writeDevStorageState({ ...current, ...nextValues });
        }
      }
    }
  });
}

function readDevStorageState(): Record<string, unknown> {
  try {
    const raw = window.localStorage.getItem(DEV_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeDevStorageState(nextValues: Record<string, unknown>): void {
  window.localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(nextValues));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
