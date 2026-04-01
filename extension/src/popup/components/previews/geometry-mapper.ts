import type { Node } from "@xyflow/react";
import type { SavedComponent, SavedPreviewInstance } from "@/lib/library/types";

export type PreviewNodeData = {
  label: string;
  componentId: string;
  screenshotDataUrl: string;
  width: number;
  height: number;
  insertionMode: SavedPreviewInstance["placement"]["insertionMode"];
  alignment: SavedPreviewInstance["placement"]["alignment"];
  order: number;
};

const COLUMN_X: Record<SavedPreviewInstance["placement"]["insertionMode"], number> = {
  before: 140,
  inside: 420,
  after: 700
};

const ALIGNMENT_NUDGE_X: Record<SavedPreviewInstance["placement"]["alignment"], number> = {
  start: -48,
  center: 0,
  end: 48
};

const ROW_START_Y = 96;
const ROW_GAP_Y = 144;
const FALLBACK_PAGE_WIDTH = 900;
const FALLBACK_PAGE_HEIGHT = 640;
const MIN_NODE_WIDTH = 140;
const MIN_NODE_HEIGHT = 96;

export function mapInstancesToPreviewNodes(
  instances: SavedPreviewInstance[],
  componentsById: Map<string, SavedComponent>
): Array<Node<PreviewNodeData, "preview-instance">> {
  const geometryInstances = instances.filter((instance) => hasNormalizedLayout(instance));
  const pageWidth =
    geometryInstances.length > 0
      ? Math.max(
          ...geometryInstances.map((instance) => instance.layout?.referenceViewport.width ?? FALLBACK_PAGE_WIDTH)
        )
      : FALLBACK_PAGE_WIDTH;
  const pageHeight =
    geometryInstances.length > 0
      ? Math.max(
          ...geometryInstances.map((instance) => instance.layout?.referenceViewport.height ?? FALLBACK_PAGE_HEIGHT)
        )
      : FALLBACK_PAGE_HEIGHT;

  return [...instances]
    .sort((left, right) => {
      if (left.placement.order !== right.placement.order) {
        return left.placement.order - right.placement.order;
      }
      return left.id.localeCompare(right.id);
    })
    .map((instance, index) => {
      const component = componentsById.get(instance.componentId);
      const fallbackWidth = 220;
      const fallbackAspectRatio = component?.thumbnailMeta?.aspectRatio ?? 1.5;
      const fallbackHeight = Math.round(fallbackWidth / fallbackAspectRatio);
      const componentAspectRatio = resolveAspectRatio(component, fallbackAspectRatio);

      const mappedGeometry = hasNormalizedLayout(instance)
        ? {
            x: instance.layout.normalizedRect.x * pageWidth,
            y: instance.layout.normalizedRect.y * pageHeight,
            width: Math.max(MIN_NODE_WIDTH, instance.layout.normalizedRect.width * pageWidth),
            height: Math.max(MIN_NODE_HEIGHT, instance.layout.normalizedRect.height * pageHeight)
          }
        : {
            x: COLUMN_X[instance.placement.insertionMode] + ALIGNMENT_NUDGE_X[instance.placement.alignment],
            y: ROW_START_Y + index * ROW_GAP_Y,
            width: fallbackWidth,
            height: Math.max(MIN_NODE_HEIGHT, fallbackHeight)
          };
      const aspectSafeSize = computeAspectSafeSize(
        mappedGeometry.width,
        mappedGeometry.height,
        componentAspectRatio
      );

      return {
        id: instance.id,
        type: "preview-instance",
        position: {
          x: mappedGeometry.x,
          y: mappedGeometry.y
        },
        draggable: false,
        selectable: false,
        style: {
          width: aspectSafeSize.width,
          height: aspectSafeSize.height
        },
        data: {
          label: component?.title ?? instance.componentId,
          componentId: instance.componentId,
          screenshotDataUrl: component?.screenshotDataUrl ?? "",
          width: aspectSafeSize.width,
          height: aspectSafeSize.height,
          insertionMode: instance.placement.insertionMode,
          alignment: instance.placement.alignment,
          order: instance.placement.order
        }
      };
    });
}

function hasNormalizedLayout(instance: SavedPreviewInstance): instance is SavedPreviewInstance & {
  layout: NonNullable<SavedPreviewInstance["layout"]>;
} {
  return Boolean(
    instance.layout &&
      Number.isFinite(instance.layout.referenceViewport.width) &&
      Number.isFinite(instance.layout.referenceViewport.height) &&
      Number.isFinite(instance.layout.normalizedRect.x) &&
      Number.isFinite(instance.layout.normalizedRect.y) &&
      Number.isFinite(instance.layout.normalizedRect.width) &&
      Number.isFinite(instance.layout.normalizedRect.height)
  );
}

function resolveAspectRatio(component: SavedComponent | undefined, fallbackAspectRatio: number): number {
  const candidate = component?.thumbnailMeta?.aspectRatio;
  if (Number.isFinite(candidate) && candidate && candidate > 0) {
    return candidate;
  }
  return fallbackAspectRatio;
}

function computeAspectSafeSize(width: number, height: number, aspectRatio: number): {
  width: number;
  height: number;
} {
  const safeRatio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const boundedWidth = Math.max(1, width);
  const boundedHeight = Math.max(1, height);

  const fitByWidth = {
    width: boundedWidth,
    height: boundedWidth / safeRatio
  };
  const fitByHeight = {
    width: boundedHeight * safeRatio,
    height: boundedHeight
  };
  const fitted =
    fitByWidth.height <= boundedHeight
      ? fitByWidth
      : fitByHeight;
  const scaleUp = Math.max(MIN_NODE_WIDTH / fitted.width, MIN_NODE_HEIGHT / fitted.height, 1);

  return {
    width: fitted.width * scaleUp,
    height: fitted.height * scaleUp
  };
}
