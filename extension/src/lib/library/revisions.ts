import type { ComponentRevision, SavedComponent } from "./types";

export type CreateAdaptedRevisionInput = {
  adaptedHtml: string;
  adaptedCssText: string;
  summary: string;
  warnings: string[];
  confidence: number;
  themeFingerprint: string;
};

export function ensureComponentRevisions(component: SavedComponent): {
  revisions: NonNullable<SavedComponent["revisions"]>;
  activeRevisionId: number;
} {
  const existingRevisions = (component.revisions ?? []).filter((revision) => revision && revision.id > 0);
  if (existingRevisions.length > 0) {
    const activeRevisionId = component.activeRevisionId && existingRevisions.some((revision) => revision.id === component.activeRevisionId)
      ? component.activeRevisionId
      : existingRevisions[existingRevisions.length - 1].id;
    return {
      revisions: existingRevisions,
      activeRevisionId
    };
  }

  const createdAt = component.capturedAt;
  return {
    revisions: [
      {
        id: 1,
        source: "capture",
        parentRevisionId: null,
        html: component.html,
        cssText: component.cssText,
        summary: "Original captured revision",
        warnings: [],
        confidence: 1,
        themeFingerprint: "",
        createdAt,
        isActive: true
      }
    ],
    activeRevisionId: 1
  };
}

export function createAdaptedComponentSnapshot(
  component: SavedComponent,
  input: CreateAdaptedRevisionInput
): SavedComponent {
  const now = new Date().toISOString();
  const base = ensureComponentRevisions(component);
  const lastRevisionId = base.revisions.reduce((max, revision) => Math.max(max, revision.id), 0);
  const nextRevisionId = lastRevisionId + 1;
  const nextRevisions: ComponentRevision[] = [
    ...base.revisions.map((revision) => ({
      ...revision,
      isActive: false
    })),
    {
      id: nextRevisionId,
      source: "adaptation",
      parentRevisionId: base.activeRevisionId,
      html: input.adaptedHtml,
      cssText: input.adaptedCssText,
      summary: input.summary,
      warnings: input.warnings,
      confidence: input.confidence,
      themeFingerprint: input.themeFingerprint,
      createdAt: now,
      isActive: true
    }
  ];

  return {
    ...component,
    html: input.adaptedHtml,
    cssText: input.adaptedCssText,
    revisions: nextRevisions,
    activeRevisionId: nextRevisionId
  };
}
