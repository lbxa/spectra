import {
  INBOX_COLLECTION_ID,
  type Collection,
  type ComponentRevisionSource,
  type ComponentRevision,
  type HostSignature,
  type SavedComponent,
  type ThumbnailMeta
} from "../types";

const COLLECTION_NAME_MAX_LENGTH = 60;
const COLLECTION_DESCRIPTION_MAX_LENGTH = 280;

export function normalizeCollectionName(name: string): string {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("Collection name is required.");
  }
  if (normalizedName.length > COLLECTION_NAME_MAX_LENGTH) {
    throw new Error(`Collection name must be ${COLLECTION_NAME_MAX_LENGTH} characters or fewer.`);
  }
  return normalizedName;
}

export function normalizeCollectionDescription(description: string | undefined): string {
  const normalizedDescription = (description ?? "").trim();
  if (normalizedDescription.length > COLLECTION_DESCRIPTION_MAX_LENGTH) {
    throw new Error(`Collection description must be ${COLLECTION_DESCRIPTION_MAX_LENGTH} characters or fewer.`);
  }
  return normalizedDescription;
}

export function normalizeComponentInput(input: SavedComponent, defaultCollectionId: string): SavedComponent {
  if (!input.id.trim()) {
    throw new Error("Component id is required.");
  }
  if (!input.url.trim()) {
    throw new Error("Component URL is required.");
  }
  if (!input.html.trim()) {
    throw new Error("Component HTML is required.");
  }
  if (typeof input.cssText !== "string") {
    throw new Error("Component CSS must be a string.");
  }
  if (!input.screenshotDataUrl.trim()) {
    throw new Error("Component screenshot is required.");
  }

  const capturedAt = new Date(input.capturedAt);
  if (Number.isNaN(capturedAt.getTime())) {
    throw new Error("Component capturedAt must be a valid ISO timestamp.");
  }

  const fallbackTitle = deriveFallbackTitle(input.url);
  const normalizedTitle = input.title.trim() || fallbackTitle;
  const normalizedCollectionIds = normalizeCollectionIds(input.collectionIds, defaultCollectionId);
  const normalizedRevisions = normalizeComponentRevisions(input.revisions, {
    html: input.html,
    cssText: input.cssText,
    capturedAt: capturedAt.toISOString()
  });
  const normalizedActiveRevisionId = normalizeActiveRevisionId(normalizedRevisions, input.activeRevisionId);
  const activeRevision = normalizedRevisions.find((revision) => revision.id === normalizedActiveRevisionId) ?? normalizedRevisions[0];

  return {
    id: input.id.trim(),
    collectionIds: normalizedCollectionIds,
    url: input.url.trim(),
    title: normalizedTitle,
    capturedAt: capturedAt.toISOString(),
    html: activeRevision.html,
    cssText: activeRevision.cssText,
    screenshotDataUrl: input.screenshotDataUrl,
    thumbnailMeta: normalizeThumbnailMeta(input.thumbnailMeta),
    sourceHostSignature: normalizeHostSignature(input.sourceHostSignature),
    revisions: normalizedRevisions,
    activeRevisionId: normalizedActiveRevisionId
  };
}

export function normalizeStoredComponent(component: SavedComponent, defaultCollectionId: string): SavedComponent {
  const collectionIds = normalizeCollectionIds(component.collectionIds, defaultCollectionId);
  const sourceHostSignature = normalizeHostSignature(component.sourceHostSignature);
  const normalizedRevisions = normalizeComponentRevisions(component.revisions, {
    html: component.html,
    cssText: typeof component.cssText === "string" ? component.cssText : "",
    capturedAt: component.capturedAt
  });
  const normalizedActiveRevisionId = normalizeActiveRevisionId(normalizedRevisions, component.activeRevisionId);
  const activeRevision =
    normalizedRevisions.find((revision) => revision.id === normalizedActiveRevisionId) ?? normalizedRevisions[0];
  return {
    ...component,
    collectionIds,
    html: activeRevision.html,
    cssText: activeRevision.cssText,
    sourceHostSignature,
    revisions: normalizedRevisions,
    activeRevisionId: normalizedActiveRevisionId
  };
}

export function byDescendingDate(leftIso: string, rightIso: string): number {
  return new Date(rightIso).getTime() - new Date(leftIso).getTime();
}

export function createId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function normalizeCollectionIds(collectionIds: string[] | undefined, defaultCollectionId: string): string[] {
  const normalized = Array.from(
    new Set((collectionIds ?? []).map((collectionId) => collectionId.trim()).filter(Boolean))
  );
  if (normalized.length > 0) {
    return normalized;
  }
  const fallbackCollectionId = defaultCollectionId.trim();
  return fallbackCollectionId ? [fallbackCollectionId] : [INBOX_COLLECTION_ID];
}

function normalizeHostSignature(value: HostSignature | undefined): HostSignature {
  if (!value || typeof value !== "object") {
    return createUnknownHostSignature();
  }

  const ancestorTags = Array.isArray(value.ancestorTags)
    ? value.ancestorTags.filter((tag) => typeof tag === "string")
    : [];

  return {
    landmark: normalizeLandmark(value.landmark),
    hostTag: typeof value.hostTag === "string" && value.hostTag ? value.hostTag : "div",
    layoutMode: normalizeLayoutMode(value.layoutMode),
    widthBucket: normalizeWidthBucket(value.widthBucket),
    depth: Number.isFinite(value.depth) ? Math.max(0, Math.floor(value.depth)) : 0,
    siblingCount: Number.isFinite(value.siblingCount) ? Math.max(0, Math.floor(value.siblingCount)) : 0,
    repeatedSiblingTag:
      typeof value.repeatedSiblingTag === "string" && value.repeatedSiblingTag ? value.repeatedSiblingTag : undefined,
    ancestorTags,
    nearbyHeading: typeof value.nearbyHeading === "string" && value.nearbyHeading ? value.nearbyHeading : undefined
  };
}

function normalizeThumbnailMeta(value: ThumbnailMeta | undefined): ThumbnailMeta | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const originalWidth = toPositiveInteger(value.originalWidth);
  const originalHeight = toPositiveInteger(value.originalHeight);
  const aspectRatio = Number.isFinite(value.aspectRatio) && value.aspectRatio > 0
    ? value.aspectRatio
    : originalWidth / originalHeight;
  const dominantColor = typeof value.dominantColor === "string" ? value.dominantColor.trim() : "";
  const blurredBackdropDataUrl =
    typeof value.blurredBackdropDataUrl === "string" ? value.blurredBackdropDataUrl.trim() : "";

  if (!originalWidth || !originalHeight || !dominantColor || !blurredBackdropDataUrl) {
    return undefined;
  }

  return {
    originalWidth,
    originalHeight,
    aspectRatio,
    dominantColor,
    blurredBackdropDataUrl
  };
}

function toPositiveInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 0;
}

function createUnknownHostSignature(): HostSignature {
  return {
    landmark: "unknown",
    hostTag: "div",
    layoutMode: "unknown",
    widthBucket: "md",
    depth: 0,
    siblingCount: 0,
    ancestorTags: []
  };
}

function normalizeLandmark(value: HostSignature["landmark"] | undefined): HostSignature["landmark"] {
  if (
    value === "header" ||
    value === "hero" ||
    value === "main" ||
    value === "section" ||
    value === "article" ||
    value === "aside" ||
    value === "nav" ||
    value === "footer" ||
    value === "form" ||
    value === "unknown"
  ) {
    return value;
  }
  return "unknown";
}

function normalizeLayoutMode(value: HostSignature["layoutMode"] | undefined): HostSignature["layoutMode"] {
  if (
    value === "block" ||
    value === "flex-row" ||
    value === "flex-column" ||
    value === "grid" ||
    value === "inline" ||
    value === "unknown"
  ) {
    return value;
  }
  return "unknown";
}

function normalizeWidthBucket(value: HostSignature["widthBucket"] | undefined): HostSignature["widthBucket"] {
  if (value === "xs" || value === "sm" || value === "md" || value === "lg" || value === "xl") {
    return value;
  }
  return "md";
}

function deriveFallbackTitle(url: string): string {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname) {
      return parsedUrl.hostname;
    }
  } catch {
    // Ignore parsing errors and use default fallback.
  }
  return "Untitled component";
}

function normalizeComponentRevisions(
  revisions: SavedComponent["revisions"],
  fallback: {
    html: string;
    cssText: string;
    capturedAt: string;
  }
): ComponentRevision[] {
  const normalized = Array.isArray(revisions)
    ? revisions
      .filter((revision): revision is ComponentRevision => Boolean(revision && revision.id > 0))
      .map((revision) => ({
        id: Math.max(1, Math.floor(revision.id)),
        source: (revision.source === "adaptation" ? "adaptation" : "capture") as ComponentRevisionSource,
        parentRevisionId:
          typeof revision.parentRevisionId === "number" && revision.parentRevisionId > 0
            ? Math.floor(revision.parentRevisionId)
            : null,
        html: typeof revision.html === "string" && revision.html.length > 0 ? revision.html : fallback.html,
        cssText: typeof revision.cssText === "string" ? revision.cssText : fallback.cssText,
        summary:
          typeof revision.summary === "string" && revision.summary.trim().length > 0
            ? revision.summary.trim()
            : revision.source === "adaptation"
              ? "Adapted revision"
              : "Original captured revision",
        warnings: Array.isArray(revision.warnings)
          ? revision.warnings.filter((warning): warning is string => typeof warning === "string")
          : [],
        confidence:
          typeof revision.confidence === "number" && Number.isFinite(revision.confidence)
            ? Math.max(0, Math.min(1, revision.confidence))
            : revision.source === "adaptation"
              ? 0.5
              : 1,
        themeFingerprint: typeof revision.themeFingerprint === "string" ? revision.themeFingerprint : "",
        createdAt: normalizeIsoTimestamp(revision.createdAt, fallback.capturedAt),
        isActive: Boolean(revision.isActive)
      }))
    : [];

  if (normalized.length > 0) {
    return normalized.sort((left, right) => left.id - right.id);
  }

  return [
    {
      id: 1,
      source: "capture",
      parentRevisionId: null,
      html: fallback.html,
      cssText: fallback.cssText,
      summary: "Original captured revision",
      warnings: [],
      confidence: 1,
      themeFingerprint: "",
      createdAt: normalizeIsoTimestamp(fallback.capturedAt, new Date().toISOString()),
      isActive: true
    }
  ];
}

function normalizeActiveRevisionId(
  revisions: ComponentRevision[],
  candidateActiveRevisionId: SavedComponent["activeRevisionId"]
): number {
  const activeFromCandidate =
    typeof candidateActiveRevisionId === "number" && revisions.some((revision) => revision.id === candidateActiveRevisionId)
      ? candidateActiveRevisionId
      : null;
  if (activeFromCandidate) {
    return activeFromCandidate;
  }
  const activeFlaggedRevision = revisions.find((revision) => revision.isActive);
  if (activeFlaggedRevision) {
    return activeFlaggedRevision.id;
  }
  return revisions[revisions.length - 1]?.id ?? 1;
}

function normalizeIsoTimestamp(value: string, fallback: string): string {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  const fallbackParsed = new Date(fallback);
  if (!Number.isNaN(fallbackParsed.getTime())) {
    return fallbackParsed.toISOString();
  }
  return new Date().toISOString();
}
