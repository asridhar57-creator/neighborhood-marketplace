"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  createMockOrder,
  getMockOrder,
  listAllMockOpenOrders,
  listMockOrdersForOwner,
  verifyMockOrderPin,
} from "@/lib/orders/mock-store";
import { clientIpFromHeaders, consumePinVerifyQuota } from "@/lib/orders/rate-limit";
import { MOCK_STORES } from "@/lib/mock-data";
import {
  parseOrderItemRow,
  parseOrderRow,
  parseStoreRow,
} from "@/lib/orders/parse";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ActionResult, CartItem, FulfillmentType, OrderRecord } from "@/lib/types";

const GUEST_COOKIE = "customer_id";
const MOCK_MERCHANT_OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

type PinRpc = {
  success: boolean;
  error?: string;
};

function isMissingRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) {
    return false;
  }
  return error.code === "PGRST202" || (error.message ?? "").includes("Could not find the function");
}

function parseGuestOrderRpc(value: unknown): { orderId: string; pin: string } | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as { success?: unknown; order_id?: unknown; verification_pin?: unknown; error?: unknown };
  if (record.success !== true) {
    return null;
  }
  const orderId = typeof record.order_id === "string" ? record.order_id : null;
  const pin = typeof record.verification_pin === "string" ? record.verification_pin : "";
  return orderId ? { orderId, pin } : null;
}
function isPinRpc(value: unknown): value is PinRpc {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("success" in value)) {
    return false;
  }
  const record = value as { success: unknown; error?: unknown };
  return (
    typeof record.success === "boolean" &&
    (record.error === undefined || typeof record.error === "string")
  );
}

function parseHandover(value: unknown): OrderRecord | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  const customerId =
    typeof record.customer_id === "string" ? record.customer_id : "";
  const storeId = typeof record.store_id === "string" ? record.store_id : null;
  const storeName =
    typeof record.store_name === "string" ? record.store_name : "Shop";
  const storeAddress =
    typeof record.store_address === "string" ? record.store_address : "";
  const pin =
    typeof record.verification_pin === "string" ? record.verification_pin : "";
  const fulfillment = record.fulfillment_type;
  const status = record.status;
  if (
    !id ||
    !storeId ||
    !pin ||
    (fulfillment !== "pickup" && fulfillment !== "self_delivery") ||
    (status !== "placed" &&
      status !== "accepted" &&
      status !== "ready" &&
      status !== "completed" &&
      status !== "cancelled")
  ) {
    return null;
  }
  const itemsRaw = record.items;
  const items: CartItem[] = Array.isArray(itemsRaw)
    ? itemsRaw.flatMap((row) => {
        if (typeof row !== "object" || row === null) {
          return [];
        }
        const item = row as Record<string, unknown>;
        const productId =
          typeof item.product_id === "string" ? item.product_id : null;
        const quantity =
          typeof item.quantity === "number" ? item.quantity : Number(item.quantity);
        const unitPrice =
          typeof item.unit_price === "number"
            ? item.unit_price
            : Number(item.unit_price);
        if (!productId || !Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
          return [];
        }
        return [
          {
            productId,
            storeId,
            title: typeof item.title === "string" ? item.title : "Item",
            unitPrice,
            quantity,
          },
        ];
      })
    : [];
  return {
    id,
    customerId,
    storeId,
    storeName,
    storeAddress,
    storeLatitude:
      typeof record.latitude === "number" ? record.latitude : Number(record.latitude) || 0,
    storeLongitude:
      typeof record.longitude === "number"
        ? record.longitude
        : Number(record.longitude) || 0,
    totalAmount:
      typeof record.total_amount === "number"
        ? record.total_amount
        : Number(record.total_amount) || 0,
    fulfillmentType: fulfillment,
    deliveryAddress:
      typeof record.delivery_address === "string" ? record.delivery_address : null,
    verificationPin: pin,
    failedPinAttempts:
      typeof record.failed_pin_attempts === "number"
        ? record.failed_pin_attempts
        : Number(record.failed_pin_attempts) || 0,
    lockedUntil:
      typeof record.locked_until === "string" ? record.locked_until : null,
    status,
    items,
    createdAt:
      typeof record.created_at === "string"
        ? record.created_at
        : new Date().toISOString(),
  };
}

async function guestCustomerId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(GUEST_COOKIE)?.value;
  if (existing) {
    return existing;
  }
  const id = crypto.randomUUID();
  cookieStore.set(GUEST_COOKIE, id, { path: "/", httpOnly: true, sameSite: "lax" });
  return id;
}

export async function placeOrder(input: {
  storeId: string;
  storeName?: string;
  fulfillmentType: FulfillmentType;
  deliveryAddress: string | null;
  items: CartItem[];
}): Promise<ActionResult<{ orderId: string }>> {
  if (input.items.length === 0) {
    return { ok: false, error: "Your bag is empty." };
  }
  if (input.items.some((item) => item.storeId !== input.storeId)) {
    return { ok: false, error: "The bag can only hold one shop at a time." };
  }
  if (
    input.fulfillmentType === "self_delivery" &&
    (input.deliveryAddress ?? "").trim().length < 6
  ) {
    return { ok: false, error: "Add a doorstep address so they can find you." };
  }

  const total = input.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  const supabase = await createClient();
  if (supabase) {
    const { data: guestRpc, error: guestError } = await supabase.rpc(
      "place_neighborhood_order",
      {
        p_store_id: input.storeId,
        p_fulfillment_type: input.fulfillmentType,
        p_delivery_address: input.deliveryAddress,
        p_items: input.items.map((item) => ({
          product_id: item.productId,
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      },
    );

    if (!isMissingRpc(guestError)) {
      if (guestError) {
        return { ok: false, error: guestError.message };
      }
      if (
        typeof guestRpc === "object" &&
        guestRpc !== null &&
        "success" in guestRpc &&
        guestRpc.success === false &&
        "error" in guestRpc &&
        typeof guestRpc.error === "string"
      ) {
        return { ok: false, error: guestRpc.error };
      }
      const placed = parseGuestOrderRpc(guestRpc);
      if (!placed) {
        return { ok: false, error: "Could not place the order." };
      }
      revalidatePath("/merchant/dashboard");
      revalidatePath(`/orders/${placed.orderId}`);
      return { ok: true, data: { orderId: placed.orderId } };
    }

    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {

    const { data: inserted, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        store_id: input.storeId,
        total_amount: total,
        fulfillment_type: input.fulfillmentType,
        delivery_address: input.deliveryAddress,
        verification_pin: pin,
        status: "placed",
      })
      .select("id")
      .single();

    const orderId =
      inserted &&
      typeof inserted === "object" &&
      "id" in inserted &&
      typeof inserted.id === "string"
        ? inserted.id
        : null;

    if (orderError || !orderId) {
      return {
        ok: false,
        error: orderError?.message ?? "Could not place the order.",
      };
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      input.items.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    );

    if (itemsError) {
      return { ok: false, error: itemsError.message };
    }

    revalidatePath("/merchant/dashboard");
    revalidatePath(`/orders/${orderId}`);
    return { ok: true, data: { orderId } };
    }
  }

  const created = createMockOrder({
    customerId: await guestCustomerId(),
    storeId: input.storeId,
    storeName: input.storeName,
    fulfillmentType: input.fulfillmentType,
    deliveryAddress: input.deliveryAddress,
    items: input.items,
  });
  if ("error" in created) {
    return { ok: false, error: created.error };
  }
  revalidatePath("/merchant/dashboard");
  revalidatePath(`/orders/${created.id}`);
  return { ok: true, data: { orderId: created.id } };
}

export async function verifyOrderPin(
  orderId: string,
  enteredPin: string,
): Promise<ActionResult<{ completed: true }>> {
  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList);
  const quota = consumePinVerifyQuota(ip);
  if (!quota.ok) {
    return quota;
  }

  if (!/^\d{4}$/.test(enteredPin)) {
    return { ok: false, error: "Enter the 4-digit PIN from the customer." };
  }

  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: "Sign in as the shop owner." };
    }

    const { data: orderRow } = await supabase
      .from("orders")
      .select("id, store_id")
      .eq("id", orderId)
      .maybeSingle();

    const storeId =
      orderRow &&
      typeof orderRow === "object" &&
      "store_id" in orderRow &&
      typeof orderRow.store_id === "string"
        ? orderRow.store_id
        : null;

    if (!storeId) {
      return { ok: false, error: "Order does not exist." };
    }

    const { data: shopRow } = await supabase
      .from("stores")
      .select("owner_id")
      .eq("id", storeId)
      .maybeSingle();

    const ownerId =
      shopRow &&
      typeof shopRow === "object" &&
      "owner_id" in shopRow &&
      typeof shopRow.owner_id === "string"
        ? shopRow.owner_id
        : null;

    if (!ownerId || ownerId !== user.id) {
      return { ok: false, error: "You can only verify orders for your own shop." };
    }

    const { data, error } = await supabase.rpc("verify_order_pin_atomic", {
      p_order_id: orderId,
      p_entered_pin: enteredPin,
    });

    if (error) {
      return { ok: false, error: error.message };
    }
    if (!isPinRpc(data)) {
      return { ok: false, error: "Unexpected response from PIN verification." };
    }
    if (!data.success) {
      return { ok: false, error: data.error ?? "Incorrect PIN." };
    }

    revalidatePath("/merchant/dashboard");
    return { ok: true, data: { completed: true } };
  }

  const result = verifyMockOrderPin(orderId, enteredPin);
  if (!result.success) {
    return { ok: false, error: result.error ?? "Incorrect PIN." };
  }
  revalidatePath("/merchant/dashboard");
  return { ok: true, data: { completed: true } };
}

export async function getOrderPageData(
  orderId: string,
): Promise<OrderRecord | null> {
  const mock = getMockOrder(orderId);
  if (mock) {
    return mock;
  }

  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const { data: handover, error: handoverError } = await supabase.rpc(
    "get_order_handover",
    { p_order_id: orderId },
  );
  if (!handoverError && handover) {
    const parsed = parseHandover(handover);
    if (parsed) {
      return parsed;
    }
  }

  const { data: rawOrder } = await supabase
    .from("orders")
    .select(
      "id, customer_id, store_id, total_amount, fulfillment_type, delivery_address, verification_pin, failed_pin_attempts, locked_until, status, created_at",
    )
    .eq("id", orderId)
    .maybeSingle();

  const order = parseOrderRow(rawOrder);
  if (!order) {
    return null;
  }

  const { data: rawShop } = await supabase
    .from("stores")
    .select("id, name, address, location")
    .eq("id", order.store_id)
    .maybeSingle();

  const shop = parseStoreRow(rawShop);

  const { data: rawItems } = await supabase
    .from("order_items")
    .select("product_id, quantity, unit_price")
    .eq("order_id", orderId);

  const itemRows = Array.isArray(rawItems)
    ? rawItems
        .map((row) => parseOrderItemRow(row))
        .filter((row): row is NonNullable<typeof row> => row !== null)
    : [];

  const coords = parseLocation(shop?.location);

  return {
    id: order.id,
    customerId: order.customer_id,
    storeId: order.store_id,
    storeName: shop?.name ?? "Shop",
    storeAddress: shop?.address ?? "",
    storeLatitude: coords.latitude,
    storeLongitude: coords.longitude,
    totalAmount: Number(order.total_amount),
    fulfillmentType: order.fulfillment_type,
    deliveryAddress: order.delivery_address,
    verificationPin: order.verification_pin,
    failedPinAttempts: order.failed_pin_attempts ?? 0,
    lockedUntil: order.locked_until,
    status: order.status,
    items: itemRows.map((row) => ({
      productId: row.product_id,
      storeId: order.store_id,
      title: "Item",
      unitPrice: Number(row.unit_price),
      quantity: row.quantity,
    })),
    createdAt: order.created_at,
  };
}

function withoutCustomerPin(order: OrderRecord): OrderRecord {
  return { ...order, verificationPin: "" };
}

export async function getMerchantDashboardOrders(): Promise<{
  usingMock: boolean;
  orders: OrderRecord[];
}> {
  if (!isSupabaseConfigured()) {
    const owned = listMockOrdersForOwner(MOCK_MERCHANT_OWNER);
    const list = owned.length ? owned : listAllMockOpenOrders();
    return {
      usingMock: true,
      orders: list.map(withoutCustomerPin),
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { usingMock: true, orders: listAllMockOpenOrders().map(withoutCustomerPin) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { usingMock: false, orders: [] };
  }

  const { data: rawShops } = await supabase
    .from("stores")
    .select("id, name, address")
    .eq("owner_id", user.id);

  const shops = Array.isArray(rawShops)
    ? rawShops
        .map((row) => parseStoreRow(row))
        .filter((row): row is NonNullable<typeof row> => row !== null)
    : [];
  const shopIds = shops.map((shop) => shop.id);
  if (shopIds.length === 0) {
    return { usingMock: false, orders: [] };
  }

  const { data: rawOrders } = await supabase
    .from("orders")
    .select(
      "id, customer_id, store_id, total_amount, fulfillment_type, delivery_address, verification_pin, failed_pin_attempts, locked_until, status, created_at",
    )
    .in("store_id", shopIds)
    .order("created_at", { ascending: false });

  const mapped: OrderRecord[] = [];
  for (const raw of Array.isArray(rawOrders) ? rawOrders : []) {
    const order = parseOrderRow(raw);
    if (!order) {
      continue;
    }
    const shop = shops.find((row) => row.id === order.store_id);
    const meta = MOCK_STORES.find((row) => row.id === order.store_id);
    mapped.push(
      withoutCustomerPin({
        id: order.id,
        customerId: order.customer_id,
        storeId: order.store_id,
        storeName: shop?.name ?? "Shop",
        storeAddress: shop?.address ?? "",
        storeLatitude: meta?.latitude ?? 0,
        storeLongitude: meta?.longitude ?? 0,
        totalAmount: Number(order.total_amount),
        fulfillmentType: order.fulfillment_type,
        deliveryAddress: order.delivery_address,
        verificationPin: order.verification_pin,
        failedPinAttempts: order.failed_pin_attempts ?? 0,
        lockedUntil: order.locked_until,
        status: order.status,
        items: [],
        createdAt: order.created_at,
      }),
    );
  }
  return { usingMock: false, orders: mapped };
}

function parseLocation(location: unknown): { latitude: number; longitude: number } {
  if (
    typeof location === "object" &&
    location !== null &&
    "coordinates" in location &&
    Array.isArray((location as { coordinates: unknown }).coordinates)
  ) {
    const [lng, lat] = (location as { coordinates: number[] }).coordinates;
    if (typeof lat === "number" && typeof lng === "number") {
      return { latitude: lat, longitude: lng };
    }
  }
  return { latitude: 0, longitude: 0 };
}
