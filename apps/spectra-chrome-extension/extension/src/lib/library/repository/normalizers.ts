import { INBOX_COLLECTION_ID, type Collection, type HostSignature, type SavedComponent, type ThumbnailMeta } from "../types";

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

  return {
    id: input.id.trim(),
    collectionIds: normalizedCollectionIds,
    url: input.url.trim(),
    title: normalizedTitle,
    capturedAt: capturedAt.toISOString(),
    html: input.html,
    cssText: input.cssText,
    screenshotDataUrl: input.screenshotDataUrl,
    thumbnailMeta: normalizeThumbnailMeta(input.thumbnailMeta),
    sourceHostSignature: normalizeHostSignature(input.sourceHostSignature)
  };
}

export function normalizeStoredComponent(component: SavedComponent, defaultCollectionId: string): SavedComponent {
  const collectionIds = normalizeCollectionIds(component.collectionIds, defaultCollectionId);
  const sourceHostSignature = normalizeHostSignature(component.sourceHostSignature);
  return {
    ...component,
    collectionIds,
    cssText: typeof component.cssText === "string" ? component.cssText : "",
    sourceHostSignature
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
