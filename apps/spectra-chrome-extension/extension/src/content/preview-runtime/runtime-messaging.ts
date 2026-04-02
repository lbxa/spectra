import type { InsertionRelation } from "../../lib/library/messages";

export async function sendStatus(
  message:
    | { type: "PREVIEW_READY" }
    | { type: "PREVIEW_INSERTED"; previewId: string; relation: InsertionRelation }
    | { type: "PREVIEW_REMOVED"; previewId: string }
    | { type: "PREVIEW_ERROR"; code: string; message: string }
    | {
        type:
          | "MAGIC_CLICKED"
          | "MAGIC_REQUEST_STARTED"
          | "MAGIC_REQUEST_SUCCEEDED"
          | "MAGIC_REQUEST_FAILED"
          | "MAGIC_PATCH_APPLIED"
          | "MAGIC_PATCH_REJECTED"
          | "MAGIC_ADAPTED_REVISION_SAVED";
        previewId?: string;
        componentId?: string;
        code?: string;
        message?: string;
      }
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
