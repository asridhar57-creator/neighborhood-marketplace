"use client";

import { create } from "zustand";

import type { FulfillmentType, OrderStatus } from "@/lib/types";

export const ACTIVE_ORDER_STORAGE_KEY = "neighborhood-active-order";

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

export const useActiveOrder = create<ActiveOrderState>((set) => ({
  order: null,
  saveOrder: (order) => set({ order }),
  clearOrder: () => set({ order: null }),
}));

export function parseActiveOrderSnapshot(value: unknown): ActiveOrderSnapshot | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const nested =
    typeof record.state === "object" && record.state !== null
      ? (record.state as Record<string, unknown>)
      : record;
  const orderRaw =
    nested.order && typeof nested.order === "object"
      ? (nested.order as Record<string, unknown>)
      : nested;
  const order_id = typeof orderRaw.order_id === "string" ? orderRaw.order_id : null;
  const verification_pin =
    typeof orderRaw.verification_pin === "string" ? orderRaw.verification_pin : null;
  const store_name =
    typeof orderRaw.store_name === "string" ? orderRaw.store_name : null;
  const total_amount =
    typeof orderRaw.total_amount === "number"
      ? orderRaw.total_amount
      : typeof orderRaw.total_amount === "string"
        ? Number(orderRaw.total_amount)
        : NaN;
  const status =
    orderRaw.status === "accepted" ||
    orderRaw.status === "ready" ||
    orderRaw.status === "completed" ||
    orderRaw.status === "cancelled"
      ? orderRaw.status
      : "placed";
  const fulfillment =
    orderRaw.fulfillment_type === "self_delivery" ? "self_delivery" : "pickup";
  if (!order_id || !verification_pin || !store_name || !Number.isFinite(total_amount)) {
    return null;
  }
  return {
    order_id,
    verification_pin,
    store_name,
    total_amount,
    status,
    whatsapp_number:
      typeof orderRaw.whatsapp_number === "string" ? orderRaw.whatsapp_number : null,
    fulfillment_type: fulfillment,
  };
}

export function readActiveOrderFromStorage(): ActiveOrderSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return parseActiveOrderSnapshot(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeActiveOrderToStorage(order: ActiveOrderSnapshot | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!order) {
    window.localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(order));
}
