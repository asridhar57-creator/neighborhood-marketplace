"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CartItem, PendingCartItem } from "@/lib/types";

type AddResult =
  | { status: "added" }
  | { status: "other-store"; currentStoreName: string };

type CartState = {
  storeId: string | null;
  storeName: string | null;
  items: CartItem[];
  pendingReplace: PendingCartItem | null;
  conflictStoreName: string | null;
  addItem: (item: PendingCartItem) => AddResult;
  replaceStoreAndAdd: (item: PendingCartItem) => void;
  confirmReplaceCart: () => void;
  cancelReplaceCart: () => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearBag: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      storeId: null,
      storeName: null,
      items: [],
      pendingReplace: null,
      conflictStoreName: null,
      addItem: (item) => {
        const { storeId, items, storeName } = get();
        if (storeId && storeId !== item.storeId) {
          set({
            pendingReplace: item,
            conflictStoreName: storeName ?? "another shop",
          });
          return {
            status: "other-store",
            currentStoreName: storeName ?? "another shop",
          };
        }
        const existing = items.find((row) => row.productId === item.productId);
        const nextItems = existing
          ? items.map((row) =>
              row.productId === item.productId
                ? { ...row, quantity: row.quantity + 1 }
                : row,
            )
          : [...items, { ...item, quantity: 1 }];
        set({
          storeId: item.storeId,
          storeName: item.storeName,
          items: nextItems,
          pendingReplace: null,
          conflictStoreName: null,
        });
        return { status: "added" };
      },
      replaceStoreAndAdd: (item) => {
        set({
          storeId: item.storeId,
          storeName: item.storeName,
          items: [{ ...item, quantity: 1 }],
          pendingReplace: null,
          conflictStoreName: null,
        });
      },
      confirmReplaceCart: () => {
        const pending = get().pendingReplace;
        if (!pending) {
          return;
        }
        set({
          storeId: pending.storeId,
          storeName: pending.storeName,
          items: [{ ...pending, quantity: 1 }],
          pendingReplace: null,
          conflictStoreName: null,
        });
      },
      cancelReplaceCart: () => {
        set({ pendingReplace: null, conflictStoreName: null });
      },
      setQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          const items = get().items.filter((row) => row.productId !== productId);
          set(
            items.length === 0
              ? { items, storeId: null, storeName: null }
              : { items },
          );
          return;
        }
        set({
          items: get().items.map((row) =>
            row.productId === productId ? { ...row, quantity } : row,
          ),
        });
      },
      clearBag: () =>
        set({
          storeId: null,
          storeName: null,
          items: [],
          pendingReplace: null,
          conflictStoreName: null,
        }),
    }),
    {
      name: "neighborhood-bag",
      partialize: (state) => ({
        storeId: state.storeId,
        storeName: state.storeName,
        items: state.items,
      }),
    },
  ),
);

export function selectBagCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function selectBagTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}
