"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CartItem, FulfillmentType, PlacedOrder } from "@/lib/types";

type AddResult =
  | { status: "added" }
  | { status: "other-store"; currentStoreName: string };

type CartState = {
  storeId: string | null;
  storeName: string | null;
  items: CartItem[];
  lastOrder: PlacedOrder | null;
  addItem: (item: Omit<CartItem, "quantity"> & { storeName: string }) => AddResult;
  replaceStoreAndAdd: (
    item: Omit<CartItem, "quantity"> & { storeName: string },
  ) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearBag: () => void;
  placeOrder: (input: {
    fulfillmentType: FulfillmentType;
    deliveryAddress: string | null;
  }) => PlacedOrder | null;
};

function fourDigitPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      storeId: null,
      storeName: null,
      items: [],
      lastOrder: null,
      addItem: (item) => {
        const { storeId, items, storeName } = get();
        if (storeId && storeId !== item.storeId) {
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
        });
        return { status: "added" };
      },
      replaceStoreAndAdd: (item) => {
        set({
          storeId: item.storeId,
          storeName: item.storeName,
          items: [{ ...item, quantity: 1 }],
        });
      },
      setQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          const items = get().items.filter((row) => row.productId !== productId);
          set(items.length === 0 ? { items, storeId: null, storeName: null } : { items });
          return;
        }
        set({
          items: get().items.map((row) =>
            row.productId === productId ? { ...row, quantity } : row,
          ),
        });
      },
      clearBag: () => set({ storeId: null, storeName: null, items: [] }),
      placeOrder: ({ fulfillmentType, deliveryAddress }) => {
        const { items, storeId, storeName } = get();
        if (!storeId || !storeName || items.length === 0) {
          return null;
        }
        const order: PlacedOrder = {
          id: crypto.randomUUID(),
          storeId,
          storeName,
          totalAmount: items.reduce(
            (sum, row) => sum + row.unitPrice * row.quantity,
            0,
          ),
          fulfillmentType,
          deliveryAddress,
          verificationPin: fourDigitPin(),
          status: "placed",
          items,
          createdAt: new Date().toISOString(),
        };
        set({ storeId: null, storeName: null, items: [], lastOrder: order });
        return order;
      },
    }),
    { name: "neighborhood-bag" },
  ),
);

export function selectBagCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function selectBagTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}
