import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Background,
  Panel,
  ReactFlow,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeProps
} from "@xyflow/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { mapInstancesToPreviewNodes, type PreviewNodeData } from "./geometry-mapper";
import type { SavedComponent, SavedPreview } from "@/lib/library/types";
import { FALLBACK_THUMBNAIL } from "../../types";
import "@xyflow/react/dist/style.css";

type PreviewCanvasProps = {
  preview: SavedPreview | null;
  componentsById: Map<string, SavedComponent>;
  isApplyDisabled?: boolean;
  onApplyPreview?: () => void;
  className?: string;
};

const MIN_CANVAS_ZOOM = 0.1;
const MAX_CANVAS_ZOOM = 3.5;
const MAX_AUTO_FIT_ZOOM = 1;
const FIT_VIEW_OPTIONS = {
  padding: 0.22,
  minZoom: MIN_CANVAS_ZOOM,
  maxZoom: MAX_AUTO_FIT_ZOOM,
  duration: 200
} as const;

const nodeTypes = {
  "preview-instance": PreviewNodeCard
};

export function PreviewCanvas({
  preview,
  componentsById,
  isApplyDisabled = false,
  onApplyPreview,
  className
}: PreviewCanvasProps) {
  const initialNodes = useMemo<Array<Node<PreviewNodeData, "preview-instance">>>(
    () => (preview ? mapInstancesToPreviewNodes(preview.instances, componentsById) : []),
    [preview, componentsById]
  );
  const [fitSequence, setFitSequence] = useState(0);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<PreviewNodeData, "preview-instance">>(initialNodes);

  useEffect(() => {
    setNodes(initialNodes);
    setFitSequence((current) => current + 1);
  }, [initialNodes, setNodes]);

  return (
    <section className={cn("relative flex h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-background/90", className)}>
      <ReactFlow
        nodes={nodes}
        edges={[]}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        minZoom={MIN_CANVAS_ZOOM}
        maxZoom={MAX_CANVAS_ZOOM}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnDoubleClick={false}
        className="bg-[radial-gradient(circle_at_20%_20%,rgba(122,203,255,0.2),transparent_45%),radial-gradient(circle_at_80%_85%,rgba(26,140,255,0.16),transparent_50%)]"
      >
        <Background gap={22} size={1} color="rgba(26,140,255,0.14)" />
        <BottomCenterCanvasControls
          fitSequence={fitSequence}
          isApplyDisabled={!preview || isApplyDisabled}
          onApplyPreview={onApplyPreview}
        />
      </ReactFlow>
    </section>
  );
}

function BottomCenterCanvasControls({
  fitSequence,
  isApplyDisabled,
  onApplyPreview
}: {
  fitSequence: number;
  isApplyDisabled: boolean;
  onApplyPreview?: () => void;
}) {
  const reactFlow = useReactFlow();

  const fitViewToNodes = (): void => {
    void reactFlow.fitView(FIT_VIEW_OPTIONS);
  };

  useEffect(() => {
    fitViewToNodes();
  }, [fitSequence, reactFlow]);

  return (
    <Panel position="bottom-center" className="m-3">
      <div className="flex items-center gap-1 rounded-xl border border-border-strong/80 bg-background/90 p-1.5 shadow-[0_10px_35px_rgba(11,58,103,0.25)] backdrop-blur-md">
        <ToolbarIconButton
          label="Zoom out"
          onClick={() => {
            void reactFlow.zoomOut({ duration: 180 });
          }}
        >
          <MinusIcon />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Fit view"
          onClick={() => {
            fitViewToNodes();
          }}
        >
          <FitIcon />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Zoom in"
          onClick={() => {
            void reactFlow.zoomIn({ duration: 180 });
          }}
        >
          <PlusIcon />
        </ToolbarIconButton>
        <div className="mx-1 h-5 w-px bg-border-strong/70" />
        <Button
          type="button"
          size="sm"
          className="h-7 px-2 text-[11px]"
          disabled={isApplyDisabled}
          onClick={onApplyPreview}
        >
          Apply preview
        </Button>
      </div>
    </Panel>
  );
}

function ToolbarIconButton({
  label,
  onClick,
  children
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground"
    >
      {children}
    </button>
  );
}

function MinusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function FitIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function PreviewNodeCard({ data }: NodeProps<Node<PreviewNodeData, "preview-instance">>) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border-strong bg-background shadow-[0_20px_44px_rgba(11,58,103,0.26)]"
      style={{ width: data.width, height: data.height }}
    >
      <img
        className="block h-full w-full bg-surface object-cover"
        alt={data.label || "Preview component"}
        src={data.screenshotDataUrl || FALLBACK_THUMBNAIL}
      />
    </div>
  );
}
