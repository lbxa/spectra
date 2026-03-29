import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { SavedComponent } from "@/lib/library/types";
import { cn } from "@/lib/utils";
import {
  Background,
  Panel,
  ReactFlow,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeProps
} from "@xyflow/react";
import { ArrowUpRight, Check } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { formatCapturedAt } from "../../lib/format-timestamp";
import { FALLBACK_THUMBNAIL } from "../../types";
import "@xyflow/react/dist/style.css";

type ComponentCanvasProps = {
  component: SavedComponent;
  activeCollectionId: string | null;
  isPreviewStarting: boolean;
  onStartPreview: (component: SavedComponent, activeCollectionId: string | null) => void;
  onClose: () => void;
  className?: string;
};

type ComponentNodeData = {
  component: SavedComponent;
  onScreenshotLoad: () => void;
};

type ComponentFlowNode = Node<ComponentNodeData, "component-card">;

const INITIAL_NODE_POSITION = { x: 180, y: 130 };
const MIN_CANVAS_ZOOM = 0.1;
const MAX_CANVAS_ZOOM = 4;
const MAX_AUTO_FIT_ZOOM = 1;
const FIT_DOWN_ONLY_VIEW_OPTIONS = {
  padding: 0.2,
  minZoom: MIN_CANVAS_ZOOM,
  maxZoom: MAX_AUTO_FIT_ZOOM
} as const;
const FIT_VIEW_ANIMATION_OPTIONS = {
  ...FIT_DOWN_ONLY_VIEW_OPTIONS,
  duration: 200
} as const;

const nodeTypes = {
  "component-card": ComponentFlowNodeCard
};

export function ComponentCanvas({
  component,
  activeCollectionId,
  isPreviewStarting,
  onStartPreview,
  onClose,
  className
}: ComponentCanvasProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const isCopied = copyStatus === "copied";
  const [fitSequence, setFitSequence] = useState(0);
  const [nodes, setNodes, onNodesChange] = useNodesState<ComponentFlowNode>([
    createComponentNode(component, INITIAL_NODE_POSITION, () => {
      setFitSequence((current) => current + 1);
    })
  ]);

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyStatus("idle");
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isCopied]);

  useEffect(() => {
    setNodes([
      createComponentNode(component, INITIAL_NODE_POSITION, () => {
        setFitSequence((current) => current + 1);
      })
    ]);
    setFitSequence((current) => current + 1);
  }, [component, setNodes]);

  const handleCopyRaw = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(component.html);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("idle");
    }
  };

  return (
    <div
      className={cn(
        "h-full w-full overflow-hidden bg-background/90 shadow-[0_24px_80px_rgba(11,58,103,0.28)] backdrop-blur-sm",
        className
      )}
    >
      <ReactFlow
        nodes={nodes}
        edges={[]}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={FIT_DOWN_ONLY_VIEW_OPTIONS}
        minZoom={MIN_CANVAS_ZOOM}
        maxZoom={MAX_CANVAS_ZOOM}
        panOnDrag
        panOnScroll
        zoomOnDoubleClick={false}
        nodesConnectable={false}
        elementsSelectable={false}
        className="bg-[radial-gradient(circle_at_25%_20%,rgba(122,203,255,0.22),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(26,140,255,0.18),transparent_50%)]"
      >
        <Background gap={22} size={1} color="rgba(26,140,255,0.14)" />
        <TopLeftMetadataCard component={component} />
        <TopCenterControlBar
          onResetNodePosition={() => {
            setNodes([
              createComponentNode(component, INITIAL_NODE_POSITION, () => {
                setFitSequence((current) => current + 1);
              })
            ]);
            setFitSequence((current) => current + 1);
          }}
          fitSequence={fitSequence}
          isCopied={isCopied}
          onCopyRaw={handleCopyRaw}
          isPreviewStarting={isPreviewStarting}
          onStartPreview={() => {
            onStartPreview(component, activeCollectionId);
          }}
        />
        <Panel position="top-right" className="m-3">
          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={onClose}>
            Close
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}

function TopCenterControlBar({
  onResetNodePosition,
  fitSequence,
  isCopied,
  onCopyRaw,
  isPreviewStarting,
  onStartPreview
}: {
  onResetNodePosition: () => void;
  fitSequence: number;
  isCopied: boolean;
  onCopyRaw: () => Promise<void>;
  isPreviewStarting: boolean;
  onStartPreview: () => void;
}) {
  const reactFlow = useReactFlow();
  const fitViewToNode = (): void => {
    void reactFlow.fitView(FIT_VIEW_ANIMATION_OPTIONS);
  };

  useEffect(() => {
    fitViewToNode();
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
            fitViewToNode();
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
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[11px] text-foreground"
          onClick={onResetNodePosition}
        >
          Center
        </Button>
        <div className="flex items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-7 rounded-r-none px-2 text-[11px] whitespace-nowrap transition-all duration-300 ease-out",
              isCopied &&
                "border-emerald-500 bg-emerald-500 text-white shadow-[0_0_0_1px_rgba(16,185,129,0.35)] hover:border-emerald-500 hover:bg-emerald-500 hover:text-white"
            )}
            onClick={() => {
              void onCopyRaw();
            }}
          >
            <span className="relative inline-flex min-w-8 items-center justify-center">
              <span
                className={cn(
                  "transition-all duration-250 ease-out",
                  isCopied ? "translate-y-1 scale-95 opacity-0" : "translate-y-0 scale-100 opacity-100"
                )}
              >
                Copy
              </span>
              <Check
                aria-hidden="true"
                className={cn(
                  "absolute h-3.5 w-3.5 transition-all duration-250 ease-out",
                  isCopied ? "translate-y-0 scale-100 opacity-100" : "-translate-y-1 scale-75 opacity-0"
                )}
              />
            </span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-7 shrink-0 rounded-l-none border-l-0 p-0"
                aria-label="Open copy options"
              >
                <ChevronUpIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="whitespace-nowrap">
                <span>Open in ChatGPT</span>
                <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </DropdownMenuItem>
              <DropdownMenuItem className="whitespace-nowrap">
                <span>Open in Claude</span>
                <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </DropdownMenuItem>
              <DropdownMenuItem className="whitespace-nowrap">
                <span>Open in Gemini</span>
                <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Other formats</DropdownMenuLabel>
                <DropdownMenuItem disabled className="justify-between gap-2 whitespace-nowrap">
                  <span>Copy as JSX</span>
                  <Badge
                    variant="outline"
                    className="border-red-500/45 bg-red-500/10 text-[10px] font-semibold text-red-600 dark:text-red-400"
                  >
                    Soon
                  </Badge>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="justify-between gap-2 whitespace-nowrap">
                  <span>Copy as JSX/Tailwind</span>
                  <Badge
                    variant="outline"
                    className="border-red-500/45 bg-red-500/10 text-[10px] font-semibold text-red-600 dark:text-red-400"
                  >
                    Soon
                  </Badge>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mx-1 h-5 w-px bg-border-strong/70" />
        <Button
          type="button"
          size="sm"
          className="h-7 px-2 text-[11px]"
          disabled={isPreviewStarting}
          onClick={onStartPreview}
        >
          {isPreviewStarting ? "Starting..." : "Preview"}
        </Button>
      </div>
    </Panel>
  );
}

function TopLeftMetadataCard({ component }: { component: SavedComponent }) {
  return (
    <Panel position="top-left" className="m-3 max-w-code-max-h">
      <div className="grid gap-2 rounded-lg border border-border-strong/80 bg-background/92 p-2.5 shadow-[0_14px_42px_rgba(11,58,103,0.22)] backdrop-blur-md">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase truncate whitespace-nowrap max-w-full" title={component.title || "Untitled component"}>
          {component.title || "Untitled component"}
        </p>
        <a
          href={component.url}
          target="_blank"
          rel="noreferrer noopener"
          className="truncate text-[11px] text-muted-foreground hover:text-foreground hover:underline"
        >
          {hostnameFromUrl(component.url)}
        </a>
        <p className="text-[11px] text-muted-foreground">{formatCapturedAt(component.capturedAt)}</p>
      </div>
    </Panel>
  );
}

function ComponentFlowNodeCard({ data }: NodeProps<ComponentFlowNode>) {
  const { component } = data;

  return (
    <div className="overflow-hidden rounded-xl border border-border-strong bg-background shadow-[0_20px_44px_rgba(11,58,103,0.26)]">
      <img
        className="block h-auto w-auto bg-surface"
        alt={component.title || "Captured component"}
        src={component.screenshotDataUrl || FALLBACK_THUMBNAIL}
        onLoad={data.onScreenshotLoad}
      />
    </div>
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

function ChevronUpIcon() {
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
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function createComponentNode(
  component: SavedComponent,
  position: { x: number; y: number },
  onScreenshotLoad: () => void
): ComponentFlowNode {
  return {
    id: component.id,
    type: "component-card",
    position,
    data: { component, onScreenshotLoad }
  };
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}
