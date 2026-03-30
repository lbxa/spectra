import type { StateStorage } from "zustand/middleware";

export const chromeStorageStateStorage: StateStorage = {
  async getItem(name) {
    const result = await chrome.storage.local.get(name);
    const candidate = result[name];
    return typeof candidate === "string" ? candidate : null;
  },
  async setItem(name, value) {
    await chrome.storage.local.set({ [name]: value });
  },
  async removeItem(name) {
    await chrome.storage.local.remove(name);
  }
};
