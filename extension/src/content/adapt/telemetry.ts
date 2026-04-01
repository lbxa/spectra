type AdaptationTelemetryEvent =
  | "magic_button_clicked"
  | "request_started"
  | "request_succeeded"
  | "request_failed"
  | "patch_applied"
  | "patch_rejected"
  | "adapted_revision_saved";

export function trackAdaptationEvent(
  event: AdaptationTelemetryEvent,
  payload: Record<string, unknown> = {}
): void {
  const message = {
    scope: "adaptation",
    event,
    ...payload
  };
  console.debug("[spectra:telemetry]", message);
}
