import type {
  AdaptComponentMessage,
  AdaptComponentResponse,
  AdaptRequest
} from "../../lib/library/messages";

export async function requestAdaptation(request: AdaptRequest): Promise<AdaptComponentResponse> {
  const response = (await chrome.runtime.sendMessage({
    type: "ADAPT_COMPONENT",
    payload: request
  } satisfies AdaptComponentMessage)) as AdaptComponentResponse;

  if (!response?.ok) {
    return {
      ok: false,
      error: response?.error ?? "Adaptation request failed"
    };
  }

  return response;
}
