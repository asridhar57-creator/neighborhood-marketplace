import type { FulfillmentType, OrderStatus } from "@/lib/types";

export type OrderRow = {
  id: string;
  customer_id: string;
  store_id: string;
  total_amount: number | string;
  fulfillment_type: FulfillmentType;
  delivery_address: string | null;
  verification_pin: string;
  failed_pin_attempts: number | null;
  locked_until: string | null;
  status: OrderStatus;
  created_at: string;
};

export type OrderItemRow = {
  product_id: string;
  quantity: number;
  unit_price: number | string;
};

export type StoreRow = {
  id: string;
  name: string;
  address: string;
  owner_id?: string;
  location?: unknown;
  whatsapp_number?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isFulfillment(value: string | null): value is FulfillmentType {
  return value === "pickup" || value === "self_delivery";
}

function isStatus(value: string | null): value is OrderStatus {
  return (
    value === "placed" ||
    value === "accepted" ||
    value === "ready" ||
    value === "completed" ||
    value === "cancelled"
  );
}

export function parseOrderRow(value: unknown): OrderRow | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = asString(value.id);
  const customer_id = asString(value.customer_id);
  const store_id = asString(value.store_id);
  const fulfillment_type = asString(value.fulfillment_type);
  const status = asString(value.status);
  const verification_pin = asString(value.verification_pin);
  const created_at = asString(value.created_at);
  const total =
    asNumber(value.total_amount) ??
    (typeof value.total_amount === "string" ? Number(value.total_amount) : null);
  if (
    !id ||
    !customer_id ||
    !store_id ||
    !verification_pin ||
    !created_at ||
    total === null ||
    Number.isNaN(total) ||
    !isFulfillment(fulfillment_type) ||
    !isStatus(status)
  ) {
    return null;
  }
  return {
    id,
    customer_id,
    store_id,
    total_amount: total,
    fulfillment_type,
    delivery_address: asString(value.delivery_address),
    verification_pin,
    failed_pin_attempts: asNumber(value.failed_pin_attempts),
    locked_until: asString(value.locked_until),
    status,
    created_at,
  };
}

export function parseStoreRow(value: unknown): StoreRow | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = asString(value.id);
  const name = asString(value.name);
  const address = asString(value.address);
  if (!id || !name || !address) {
    return null;
  }
  return {
    id,
    name,
    address,
    owner_id: asString(value.owner_id) ?? undefined,
    location: value.location,
    whatsapp_number: asString(value.whatsapp_number) ?? undefined,
  };
}

export function parseOrderItemRow(value: unknown): OrderItemRow | null {
  if (!isRecord(value)) {
    return null;
  }
  const product_id = asString(value.product_id);
  const quantity = asNumber(value.quantity);
  const unit_price =
    asNumber(value.unit_price) ??
    (typeof value.unit_price === "string" ? Number(value.unit_price) : null);
  if (!product_id || quantity === null || unit_price === null || Number.isNaN(unit_price)) {
    return null;
  }
  return { product_id, quantity, unit_price };
}
