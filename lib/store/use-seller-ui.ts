"use client";

import { create } from "zustand";

type SellerUiState = {
  open: boolean;
  openSeller: () => void;
  closeSeller: () => void;
  setOpen: (open: boolean) => void;
};

export const useSellerUi = create<SellerUiState>((set) => ({
  open: false,
  openSeller: () => set({ open: true }),
  closeSeller: () => set({ open: false }),
  setOpen: (open) => set({ open }),
}));
