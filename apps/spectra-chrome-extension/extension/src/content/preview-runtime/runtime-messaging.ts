import type { InsertionRelation } from "../../lib/library/messages";

export async function sendStatus(
  message:
    | { type: "PREVIEW_READY" }
    | { type: "PREVIEW_INSERTED"; previewId: string; relation: InsertionRelation }
    | { type: "PREVIEW_REMOVED"; previewId: string }
    | { type: "PREVIEW_ERROR"; code: string; message: string }
): Promise<void> {
  try {
    await chrome.runtime.sendMessage(message);
  } catch {
    // Ignore when service worker is unavailable.
  }
}

export async function sendRuntimeRequest<TResponse>(message: unknown): Promise<TResponse> {
  const response = await chrome.runtime.sendMessage(message);
  // TODO: tighten runtime response validation once preview command contracts are stabilized.
  return response as TResponse;
}
