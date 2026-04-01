import type {
  PreviewRuntimeDiagnostic,
  PreviewRuntimeDiagnosticCode,
  PreviewRuntimeDiagnosticSeverity
} from "./surface-model";

export function createRuntimeDiagnostic(input: {
  code: PreviewRuntimeDiagnosticCode;
  message: string;
  severity?: PreviewRuntimeDiagnosticSeverity;
}): PreviewRuntimeDiagnostic {
  return {
    code: input.code,
    message: input.message,
    severity: input.severity ?? "warning",
    createdAt: new Date().toISOString()
  };
}
