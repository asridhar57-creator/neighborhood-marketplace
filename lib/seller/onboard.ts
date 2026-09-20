import { createClient } from "@/lib/supabase/client";
import type { ActionResult, BusinessType } from "@/lib/types";

export type SellerStoreDraft = {
  name: string;
  businessType: BusinessType;
  category: string;
  whatsappNumber: string;
  address: string;
  landmark: string;
  longitude: number;
  latitude: number;
};

function slugify(name: string, suffix: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "shop"}-${suffix}`;
}

function digitsPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    return digits;
  }
  if (digits.startsWith("91") && digits.length >= 12) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function isMissingRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) {
    return false;
  }
  return (
    error.code === "PGRST202" ||
    (error.message ?? "").includes("Could not find the function")
  );
}

function parseStoreId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = (value as { id: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

export async function createStoreForOwner(
  draft: SellerStoreDraft,
): Promise<ActionResult<{ storeId: string }>> {
  const supabase = createClient();
  if (!supabase) {
    return { ok: true, data: { storeId: "mock-local-store" } };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sign in before listing your shop." };
  }

  const phone = digitsPhone(draft.whatsappNumber);
  const slug = slugify(draft.name, user.id.slice(0, 8));

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    phone,
    full_name: draft.name,
  });
  if (profileError) {
    return {
      ok: false,
      error: profileError.message,
    };
  }

  const { data: rpcId, error: rpcError } = await supabase.rpc(
    "create_neighborhood_store",
    {
      p_name: draft.name.trim(),
      p_slug: slug,
      p_business_type: draft.businessType,
      p_category: draft.category,
      p_whatsapp: phone,
      p_address: draft.address.trim(),
      p_landmark: draft.landmark.trim() || null,
      p_lng: draft.longitude,
      p_lat: draft.latitude,
    },
  );

  if (!isMissingRpc(rpcError)) {
    if (rpcError) {
      return { ok: false, error: rpcError.message };
    }
    const storeId = parseStoreId(rpcId);
    if (!storeId) {
      return { ok: false, error: "Could not create the shop listing." };
    }
    return { ok: true, data: { storeId } };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("stores")
    .insert({
      owner_id: user.id,
      name: draft.name.trim(),
      slug,
      business_type: draft.businessType,
      category: draft.category,
      address: draft.address.trim(),
      landmark: draft.landmark.trim() || null,
      whatsapp_number: phone,
      allows_pickup: draft.businessType === "retail",
      allows_self_delivery: false,
      location: {
        type: "Point",
        coordinates: [draft.longitude, draft.latitude],
      },
    })
    .select("id")
    .single();

  if (insertError) {
    return { ok: false, error: insertError.message };
  }
  const storeId = parseStoreId(inserted);
  if (!storeId) {
    return { ok: false, error: "Could not create the shop listing." };
  }
  return { ok: true, data: { storeId } };
}
