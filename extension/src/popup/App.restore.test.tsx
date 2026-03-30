import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Collection, SavedComponent } from "@/lib/library/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { usePopupStore } from "./state/store";

vi.mock("./components/CaptureHeader", () => ({
  CaptureHeader: () => <div>CaptureHeader</div>
}));

vi.mock("./components/library/CollectionRail", () => ({
  CollectionRail: ({ selectedCollectionId }: { selectedCollectionId: string | null }) => (
    <div>CollectionRail:{selectedCollectionId ?? "none"}</div>
  )
}));

vi.mock("./components/library/LibraryGrid", () => ({
  LibraryGrid: ({
    activeComponent,
    onCloseDetails
  }: {
    activeComponent: SavedComponent | null;
    onCloseDetails: () => void;
  }) => (
    <div>
      <div data-testid="active-component">{activeComponent ? activeComponent.id : "none"}</div>
      <button type="button" onClick={onCloseDetails}>
        Close details
      </button>
    </div>
  )
}));

vi.mock("@/lib/library/repository", () => ({
  libraryRepository: {
    initLibrary: vi.fn(),
    getLibraryMeta: vi.fn(),
    listCollections: vi.fn(),
    listComponents: vi.fn(),
    createCollection: vi.fn(),
    updateCollection: vi.fn(),
    deleteCollection: vi.fn(),
    copyComponentToCollection: vi.fn(),
    moveComponentToCollection: vi.fn(),
    deleteComponent: vi.fn()
  }
}));

vi.mock("./lib/library-preferences", () => ({
  getLibraryPreferences: vi.fn(),
  setSelectedCollectionPreference: vi.fn()
}));

const { libraryRepository } = await import("@/lib/library/repository");
const { getLibraryPreferences } = await import("./lib/library-preferences");

function createCollection(id: string): Collection {
  const now = new Date().toISOString();
  return {
    id,
    name: id,
    description: "",
    createdAt: now,
    updatedAt: now,
    isSystem: false
  };
}

function createComponent(id: string, collectionId: string): SavedComponent {
  return {
    id,
    collectionIds: [collectionId],
    url: "https://example.com",
    title: id,
    capturedAt: new Date().toISOString(),
    html: "<div />",
    cssText: "",
    screenshotDataUrl: "data:image/png;base64,abc",
    sourceHostSignature: {
      landmark: "unknown",
      hostTag: "div",
      layoutMode: "unknown",
      widthBucket: "md",
      depth: 0,
      siblingCount: 0,
      ancestorTags: []
    }
  };
}

async function seedPersistedPopupState(state: Record<string, unknown>) {
  await chrome.storage.local.set({
    "spectra-popup-store": JSON.stringify({
      state,
      version: 1
    })
  });
}

describe("popup restore behavior", () => {
  beforeEach(() => {
    vi.mocked(libraryRepository.initLibrary).mockResolvedValue(undefined);
    vi.mocked(libraryRepository.getLibraryMeta).mockResolvedValue({
      id: "library",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      defaultCollectionId: "col-1"
    });
    vi.mocked(libraryRepository.listCollections).mockResolvedValue([createCollection("col-1")]);
    vi.mocked(libraryRepository.listComponents).mockImplementation(async (collectionId?: string) => {
      if (collectionId === "col-1") {
        return [createComponent("cmp-1", "col-1")];
      }
      return [];
    });
    vi.mocked(getLibraryPreferences).mockResolvedValue({
      selectedCollectionId: "col-1"
    });
  });

  it("shows hydration gate before rendering the collection view", async () => {
    await seedPersistedPopupState({
      selectedCollectionId: "col-1",
      selectedComponentId: "cmp-1",
      activeView: "componentCanvas",
      lastViewed: {
        view: "componentCanvas",
        collectionId: "col-1",
        componentId: "cmp-1"
      }
    });

    render(<App />);

    expect(screen.getByText("Restoring last view...")).toBeInTheDocument();
    expect(screen.queryByText(/CollectionRail/)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/CollectionRail:/)).toBeInTheDocument();
    });
  });

  it("restores directly to component canvas when persisted destination is valid", async () => {
    await seedPersistedPopupState({
      selectedCollectionId: "col-1",
      selectedComponentId: "cmp-1",
      activeView: "componentCanvas",
      lastViewed: {
        view: "componentCanvas",
        collectionId: "col-1",
        componentId: "cmp-1"
      }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("active-component")).toHaveTextContent("cmp-1");
    });
  });

  it("repairs stale persisted destination when component is missing", async () => {
    vi.mocked(libraryRepository.listComponents).mockResolvedValue([]);
    await seedPersistedPopupState({
      selectedCollectionId: "col-1",
      selectedComponentId: "cmp-missing",
      activeView: "componentCanvas",
      lastViewed: {
        view: "componentCanvas",
        collectionId: "col-1",
        componentId: "cmp-missing"
      }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("active-component")).toHaveTextContent("none");
    });
    expect(usePopupStore.getState().lastViewed).toBeNull();
    expect(usePopupStore.getState().activeView).toBe("collection");
  });

  it("clears lastViewed when user manually closes component canvas", async () => {
    await seedPersistedPopupState({
      selectedCollectionId: "col-1",
      selectedComponentId: "cmp-1",
      activeView: "componentCanvas",
      lastViewed: {
        view: "componentCanvas",
        collectionId: "col-1",
        componentId: "cmp-1"
      }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("active-component")).toHaveTextContent("cmp-1");
    });

    fireEvent.click(screen.getByRole("button", { name: "Close details" }));

    await waitFor(() => {
      expect(usePopupStore.getState().selectedComponentId).toBeNull();
    });
    expect(usePopupStore.getState().lastViewed).toBeNull();
    expect(usePopupStore.getState().activeView).toBe("collection");
  });
});
