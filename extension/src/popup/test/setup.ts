import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

type MessageListener = (message: unknown) => void;

const storageState = new Map<string, unknown>();
const messageListeners = new Set<MessageListener>();

if (!("chrome" in globalThis)) {
  Reflect.set(globalThis, "chrome", {});
}

const chromeObject = Reflect.get(globalThis, "chrome") as Record<string, unknown>;
chromeObject.runtime = {
  sendMessage: vi.fn(async () => ({ ok: true })),
  onMessage: {
    addListener: vi.fn((listener: MessageListener) => {
      messageListeners.add(listener);
    }),
    removeListener: vi.fn((listener: MessageListener) => {
      messageListeners.delete(listener);
    })
  }
};
chromeObject.tabs = {
  query: vi.fn(async () => [{ active: true, lastFocusedWindow: true, url: "https://example.com" }])
};
chromeObject.storage = {
  local: {
    get: vi.fn(async (keys?: unknown) => {
      if (typeof keys === "string") {
        return { [keys]: storageState.get(keys) };
      }
      if (Array.isArray(keys)) {
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          if (typeof key === "string") {
            result[key] = storageState.get(key);
          }
        }
        return result;
      }
      if (keys && typeof keys === "object") {
        const defaults = keys as Record<string, unknown>;
        const result: Record<string, unknown> = { ...defaults };
        for (const [key, value] of storageState.entries()) {
          result[key] = value;
        }
        return result;
      }
      return Object.fromEntries(storageState.entries());
    }),
    set: vi.fn(async (values: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(values)) {
        storageState.set(key, value);
      }
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const keysToRemove = Array.isArray(keys) ? keys : [keys];
      for (const key of keysToRemove) {
        storageState.delete(key);
      }
    })
  }
};

beforeEach(() => {
  storageState.clear();
});

afterEach(() => {
  vi.clearAllMocks();
  messageListeners.clear();
});
