import { create } from "zustand";

interface UiStore {
  hideDates: boolean;
  toggleHideDates: () => void;
}

export const useUi = create<UiStore>((set) => ({
  hideDates: false,
  toggleHideDates: () => set((s) => ({ hideDates: !s.hideDates })),
}));
