import { describe, expect, it, vi } from "vitest";
import { createPreviewSession } from "./preview-session";

describe("createPreviewSession", () => {
  it("uses injected messaging subscription and unsubscribes on teardown", () => {
    const unsubscribe = vi.fn();
    const subscribeRuntimeMessages = vi.fn(() => unsubscribe);
    const runtime = createPreviewSession({
      messaging: {
        sendStatus: vi.fn(async () => undefined),
        sendRuntimeRequest: vi.fn(async () => undefined) as unknown as <TResponse>(
          message: unknown
        ) => Promise<TResponse>,
        subscribeRuntimeMessages
      }
    });

    expect(subscribeRuntimeMessages).toHaveBeenCalledOnce();
    runtime.teardown();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
