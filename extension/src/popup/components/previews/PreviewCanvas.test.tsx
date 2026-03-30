import { fireEvent, render, screen } from "@testing-library/react";
import type { SavedComponent, SavedPreview } from "@/lib/library/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewCanvas } from "./PreviewCanvas";

const flowApi = {
  zoomOut: vi.fn(),
  zoomIn: vi.fn(),
  fitView: vi.fn()
};

vi.mock("@xyflow/react", async () => {
  const React = await import("react");
  return {
    Background: () => <div data-testid="preview-background" />,
    Panel: ({ children, position }: { children: React.ReactNode; position: string }) => (
      <div data-testid={`panel-${position}`}>{children}</div>
    ),
    ReactFlow: ({
      nodes,
      nodeTypes,
      children,
      className
    }: {
      nodes: Array<{ id: string; type: string; data: unknown }>;
      nodeTypes: Record<string, React.ComponentType<{ data: unknown; id: string }>>;
      children: React.ReactNode;
      className?: string;
    }) => (
      <div data-testid="preview-react-flow" className={className}>
        {nodes.map((node) => {
          const NodeComponent = nodeTypes[node.type];
          if (!NodeComponent) {
            return null;
          }
          return <NodeComponent key={node.id} data={node.data} id={node.id} />;
        })}
        {children}
      </div>
    ),
    useNodesState: (initialNodes: unknown[]) => {
      const [nodes, setNodes] = React.useState(initialNodes);
      return [nodes, setNodes, vi.fn()] as const;
    },
    useReactFlow: () => flowApi
  };
});

describe("PreviewCanvas", () => {
  const preview: SavedPreview = {
    id: "pv-1",
    name: "Homepage Preview",
    status: "active",
    target: {
      origin: "https://example.com",
      pathname: "/",
      matchMode: "exact_path",
      canonicalUrl: "https://example.com/"
    },
    instances: [
      {
        id: "inst-1",
        componentId: "cmp-1",
        componentVersion: 1,
        placement: {
          anchor: {
            strategy: "selector",
            primarySelector: "main",
            fallbackSelectors: []
          },
          insertionMode: "inside",
          alignment: "center",
          order: 1
        },
        render: {
          visible: true
        }
      }
    ],
    createdAt: "2026-03-30T12:00:00.000Z",
    updatedAt: "2026-03-30T12:00:00.000Z",
    revision: 1,
    schemaVersion: 1
  };
  const componentsById = new Map<string, SavedComponent>([
    [
      "cmp-1",
      {
        id: "cmp-1",
        collectionIds: ["col-1"],
        url: "https://example.com",
        title: "Hero Block",
        capturedAt: "2026-03-30T12:00:00.000Z",
        html: "<div />",
        cssText: "",
        screenshotDataUrl: "data:image/png;base64,hero",
        sourceHostSignature: {
          landmark: "unknown",
          hostTag: "div",
          layoutMode: "unknown",
          widthBucket: "md",
          depth: 0,
          siblingCount: 0,
          ancestorTags: []
        }
      }
    ]
  ]);

  beforeEach(() => {
    flowApi.zoomOut.mockClear();
    flowApi.zoomIn.mockClear();
    flowApi.fitView.mockClear();
  });

  it("renders as a full-bleed stage without duplicate preview metadata text", () => {
    const { container } = render(<PreviewCanvas preview={preview} componentsById={componentsById} />);

    const section = container.querySelector("section");
    expect(section).toHaveClass("h-full", "flex-1", "overflow-hidden");
    expect(section?.className).not.toContain("p-2");
    expect(screen.queryByText(preview.name)).not.toBeInTheDocument();
    expect(screen.queryByText(preview.target.canonicalUrl)).not.toBeInTheDocument();
  });

  it("renders screenshot-only nodes", () => {
    render(<PreviewCanvas preview={preview} componentsById={componentsById} />);

    for (const instance of preview.instances) {
      const screenshot = screen.getByAltText("Hero Block");
      expect(screenshot).toBeInTheDocument();
      expect(screenshot).toHaveClass("object-cover");
      expect(screenshot).not.toHaveClass("object-contain");
      expect(screen.queryByText("Hero Block")).not.toBeInTheDocument();
      expect(screen.queryByText(instance.componentId)).not.toBeInTheDocument();
    }
  });

  it("wires zoom and fit toolbar controls to flow actions", () => {
    render(<PreviewCanvas preview={preview} componentsById={componentsById} />);

    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    fireEvent.click(screen.getByRole("button", { name: "Fit view" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));

    expect(flowApi.zoomOut).toHaveBeenCalledWith({ duration: 180 });
    expect(flowApi.zoomIn).toHaveBeenCalledWith({ duration: 180 });
    expect(flowApi.fitView).toHaveBeenCalled();
  });

  it("triggers apply callback", () => {
    const onApplyPreview = vi.fn();
    render(
      <PreviewCanvas
        preview={preview}
        componentsById={componentsById}
        onApplyPreview={onApplyPreview}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Apply preview" }));
    expect(onApplyPreview).toHaveBeenCalledOnce();
  });
});
