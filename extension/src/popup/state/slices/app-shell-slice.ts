import type { StateCreator } from "zustand";
import type { PopupStore } from "./collection-slice";

export type ActiveSpace = "library" | "previews";

export type AppShellSlice = {
  activeSpace: ActiveSpace;
  setActiveSpace: (space: ActiveSpace) => void;
};

type PopupStoreCreator<TSlice> = StateCreator<
  PopupStore,
  [],
  [],
  TSlice
>;

export const initialAppShellSliceState: Pick<AppShellSlice, "activeSpace"> = {
  activeSpace: "library"
};

export const createAppShellSlice: PopupStoreCreator<AppShellSlice> = (set) => ({
  ...initialAppShellSliceState,
  setActiveSpace(space) {
    set({
      activeSpace: space
    });
  }
});
