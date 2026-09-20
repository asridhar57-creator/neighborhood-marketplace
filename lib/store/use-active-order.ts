"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { FulfillmentType, OrderStatus } from "@/lib/types";

export type ActiveOrderSnapshot = {
  order_id: string;
  verification_pin: string;
  store_name: string;
  total_amount: number;
  status: OrderStatus;
  whatsapp_number: string | null;
  fulfillment_type: FulfillmentType;
};

type ActiveOrderState = {
  order: ActiveOrderSnapshot | null;
  saveOrder: (order: ActiveOrderSnapshot) => void;
  clearOrder: () => void;
};

export const useActiveOrder = create<ActiveOrderState>()(
  persist(
    (set) => ({
      order: null,
      saveOrder: (order) => set({ order }),
      clearOrder: () => set({ order: null }),
    }),
    {
      name: "neighborhood-active-order",
      skipHydration: true,
      partialize: (state) => ({ order: state.order }),
    },
  ),
);
