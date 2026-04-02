import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdaptRequest, AdaptationPatch } from "../lib/library/messages";
import { requestAdaptationFromBackend } from "./adapt-client";

function createRequest(): AdaptRequest {
  return {
    targetSiteContext: {
      globalThemeTokens: {
        "--font-family-base": "Inter",
        "--color-text": "rgb(20 20 20)"
      },
      insertionContext: {
        hostTag: "section",
        hostClasses: ["hero"]
      },
      nativeExemplars: [],
      hardConstraints: {
        maxOverrideCssChars: 2000,
        protectedNodeIds: ["node-1"]
      },
      metadata: {
        pageUrl: "https://example.com/page",
        pageTitle: "Example Page",
        themeFingerprint: "abc123"
      }
    },
    componentPack: {
      normalizedHtml: "<div data-spectra-node-id=\"node-1\">Card</div>",
      baseCss: ".card{padding:8px;}",
      stableNodeIds: ["node-1"],
      semanticRoleHint: "Card",
      protectedNodeIds: ["node-1"],
      wrapperRootId: "spectra-root"
    }
  };
}

function createPatch(): AdaptationPatch {
  return {
    strategy: "css_override",
    summary: "Applied",
    overrideCss: ":scope{color:rgb(1 2 3);}",
    attributeEdits: [],
    preservedNodeIds: [],
    confidence: 0.9,
    warnings: []
  };
}

describe("requestAdaptationFromBackend", () => {
  beforeEach(() => {
    vi.useRealTimers();
    Reflect.set(globalThis, "chrome", {
      storage: {
        local: {
          get: vi.fn(async () => ({}))
        }
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("maps payload and posts to backend URL from storage", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          ok: true,
          patch: createPatch()
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    });
    const storageGet = vi.fn(async () => ({ "spectra.magic.backendBaseUrl": "http://localhost:9000/" }));
    Reflect.set(globalThis, "chrome", {
      storage: {
        local: {
          get: storageGet
        }
      }
    });

    const patch = await requestAdaptationFromBackend(createRequest(), {
      deps: {
        fetch: fetchMock
      }
    });

    expect(patch).toEqual(createPatch());
    expect(storageGet).toHaveBeenCalledWith("spectra.magic.backendBaseUrl");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:9000/v1/adapt");
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        "content-type": "application/json"
      }
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      targetSiteContext: {
        url: "https://example.com/page",
        title: "Example Page",
        rootSelector: "section",
        protectedNodeIds: ["node-1"]
      },
      componentPack: {
        title: "Card",
        html: "<div data-spectra-node-id=\"node-1\">Card</div>"
      }
    });
  });

  it("throws backend response body when request fails", async () => {
    const fetchMock = vi.fn(async () => new Response("upstream exploded", { status: 502 }));

    await expect(
      requestAdaptationFromBackend(createRequest(), {
        deps: {
          fetch: fetchMock,
          getBackendBaseUrl: async () => "http://api.test"
        }
      })
    ).rejects.toThrow("upstream exploded");
  });

  it("throws timeout error when abort fires", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_: string, init?: RequestInit) => {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    });

    const pendingExpectation = expect(
      requestAdaptationFromBackend(createRequest(), {
        timeoutMs: 5,
        deps: {
          fetch: fetchMock,
          getBackendBaseUrl: async () => "http://api.test"
        }
      })
    ).rejects.toThrow("Adaptation request timed out");
    await vi.advanceTimersByTimeAsync(10);
    await pendingExpectation;
  });

  it("rejects invalid backend payload shape", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          ok: true,
          patch: {
            ...createPatch(),
            strategy: "unknown"
          }
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    });

    await expect(
      requestAdaptationFromBackend(createRequest(), {
        deps: {
          fetch: fetchMock,
          getBackendBaseUrl: async () => "http://api.test"
        }
      })
    ).rejects.toThrow("Backend returned invalid adaptation payload");
  });
});
