import type { StateCreator } from "zustand";
import type { PopupStore } from "./collection-slice";

export type ActiveSpace = "library" | "previews";

export type AppSlice = {
  activeSpace: ActiveSpace;
  setActiveSpace: (space: ActiveSpace) => void;
};

type PopupStoreCreator<TSlice> = StateCreator<
  PopupStore,
  [],
  [],
  TSlice
>;

export const initialAppSliceState: Pick<AppSlice, "activeSpace"> = {
  activeSpace: "library"
};

export const createAppSlice: PopupStoreCreator<AppSlice> = (set) => ({
  ...initialAppSliceState,
  setActiveSpace(space) {
    set({
      activeSpace: space
    });
  }
});
