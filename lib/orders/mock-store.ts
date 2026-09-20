import { MOCK_STORES } from "@/lib/mock-data";
import type { CartItem, FulfillmentType, OrderRecord } from "@/lib/types";

type GlobalOrders = typeof globalThis & {
  __neighborhoodOrders?: Map<string, OrderRecord>;
};

function store(): Map<string, OrderRecord> {
  const g = globalThis as GlobalOrders;
  if (!g.__neighborhoodOrders) {
    g.__neighborhoodOrders = new Map();
  }
  return g.__neighborhoodOrders;
}

function fourDigitPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function createMockOrder(input: {
  customerId: string;
  storeId: string;
  storeName?: string;
  storeAddress?: string;
  storeLatitude?: number;
  storeLongitude?: number;
  fulfillmentType: FulfillmentType;
  deliveryAddress: string | null;
  items: CartItem[];
}): OrderRecord | { error: string } {
  const shop = MOCK_STORES.find((row) => row.id === input.storeId);
  if (shop?.businessType === "service") {
    return { error: "Service profiles do not take a bag." };
  }
  if (!shop && !input.storeName) {
    return { error: "That shop is not on this street." };
  }
  if (input.items.length === 0) {
    return { error: "Your bag is empty." };
  }
  if (input.items.some((item) => item.storeId !== input.storeId)) {
    return { error: "The bag can only hold one shop at a time." };
  }

  const order: OrderRecord = {
    id: crypto.randomUUID(),
    customerId: input.customerId,
    storeId: input.storeId,
    storeName: shop?.name ?? input.storeName ?? "Shop",
    storeAddress: shop?.address ?? input.storeAddress ?? "",
    storeLatitude: shop?.latitude ?? input.storeLatitude ?? 0,
    storeLongitude: shop?.longitude ?? input.storeLongitude ?? 0,
    totalAmount: input.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    ),
    fulfillmentType: input.fulfillmentType,
    deliveryAddress: input.deliveryAddress,
    verificationPin: fourDigitPin(),
    failedPinAttempts: 0,
    lockedUntil: null,
    status: "placed",
    items: input.items,
    createdAt: new Date().toISOString(),
  };
  store().set(order.id, order);
  return order;
}

export function getMockOrder(id: string): OrderRecord | null {
  return store().get(id) ?? null;
}

export function listMockOrdersForOwner(ownerId: string): OrderRecord[] {
  const owned = new Set(
    MOCK_STORES.filter((shop) => shop.ownerId === ownerId).map((shop) => shop.id),
  );
  return [...store().values()]
    .filter((order) => owned.has(order.storeId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listAllMockOpenOrders(): OrderRecord[] {
  return [...store().values()]
    .filter((order) => order.status !== "completed" && order.status !== "cancelled")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

type PinRpc = { success: boolean; error?: string };

export function verifyMockOrderPin(orderId: string, enteredPin: string): PinRpc {
  const order = store().get(orderId);
  if (!order) {
    return { success: false, error: "Order does not exist." };
  }
  if (order.status === "completed") {
    return { success: false, error: "Order has already been completed." };
  }
  if (order.status === "cancelled") {
    return { success: false, error: "Order has been cancelled." };
  }
  if (order.lockedUntil && new Date(order.lockedUntil) > new Date()) {
    const when = new Date(order.lockedUntil).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
    return {
      success: false,
      error: `Verification temporarily locked. Try again after ${when}`,
    };
  }

  if (order.verificationPin === enteredPin) {
    const next: OrderRecord = {
      ...order,
      status: "completed",
      failedPinAttempts: 0,
      lockedUntil: null,
    };
    store().set(orderId, next);
    return { success: true };
  }

  const attempts = order.failedPinAttempts + 1;
  if (attempts >= 3) {
    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    store().set(orderId, {
      ...order,
      failedPinAttempts: 0,
      lockedUntil,
    });
    return {
      success: false,
      error: "Too many failed attempts. Verification locked for 15 minutes.",
    };
  }

  store().set(orderId, { ...order, failedPinAttempts: attempts });
  return {
    success: false,
    error: `Incorrect PIN. ${3 - attempts} attempt(s) remaining.`,
  };
}
