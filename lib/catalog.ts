import { createHash } from "node:crypto";

import { distanceMeters } from "@/lib/geo";
import { MOCK_PRODUCTS, MOCK_STORES } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import { isUsingMockCatalog } from "@/lib/supabase/env";
import type { BusinessType, NeighborhoodListing, Product, Store } from "@/lib/types";

const PRODUCT_PROBE_TERMS = [
  "",
  "Organic A2 Gir Cow Ghee (500ml)",
  "Stone-ground Whole Wheat Atta (5kg)",
  "Raw Wildflower Honey (250g)",
  "Wheat Atta (5kg)",
  "Wild Honey (250g)",
] as const;

type SearchRpcRow = {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  category: string;
  address: string;
  landmark: string | null;
  whatsapp_number: string;
  allows_pickup: boolean;
  allows_self_delivery: boolean;
  is_taking_orders: boolean;
  visiting_charge: number | string | null;
  completed_orders_count: number;
  is_sponsored: boolean;
  distance_meters: number;
  matched_product_title: string | null;
  matched_product_price: number | string | null;
  matched_product_image: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function uuidFromSeed(seed: string): string {
  const hash = createHash("sha1").update(seed).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseSearchRow(value: unknown): SearchRpcRow | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = asString(value.id);
  const name = asString(value.name);
  const slug = asString(value.slug);
  const business_type = asString(value.business_type);
  const category = asString(value.category);
  const address = asString(value.address);
  const whatsapp_number = asString(value.whatsapp_number);
  const distance_meters = asNumber(value.distance_meters);
  if (
    !id ||
    !name ||
    !slug ||
    !business_type ||
    !category ||
    !address ||
    !whatsapp_number ||
    distance_meters === null
  ) {
    return null;
  }
  return {
    id,
    name,
    slug,
    business_type,
    category,
    address,
    landmark: asString(value.landmark),
    whatsapp_number,
    allows_pickup: asBoolean(value.allows_pickup, true),
    allows_self_delivery: asBoolean(value.allows_self_delivery, false),
    is_taking_orders: asBoolean(value.is_taking_orders, true),
    visiting_charge: asNumber(value.visiting_charge),
    completed_orders_count: asNumber(value.completed_orders_count) ?? 0,
    is_sponsored: asBoolean(value.is_sponsored, false),
    distance_meters,
    matched_product_title: asString(value.matched_product_title),
    matched_product_price: asNumber(value.matched_product_price),
    matched_product_image: asString(value.matched_product_image),
  };
}

function storeFromSearchRow(row: SearchRpcRow, originLat: number, originLng: number): Store {
  return {
    id: row.id,
    ownerId: "",
    name: row.name,
    slug: row.slug,
    businessType: row.business_type === "service" ? "service" : "retail",
    category: row.category,
    serviceTags: [],
    visitingCharge: asNumber(row.visiting_charge),
    latitude: originLat,
    longitude: originLng,
    address: row.address,
    landmark: row.landmark,
    whatsappNumber: row.whatsapp_number,
    allowsPickup: row.allows_pickup,
    allowsSelfDelivery: row.allows_self_delivery,
    deliveryRadiusKm: 3,
    isTakingOrders: row.is_taking_orders,
    completedOrdersCount: row.completed_orders_count,
    isActive: true,
    isSponsored: row.is_sponsored,
    sponsoredUntil: null,
  };
}

function productFromMatch(
  storeId: string,
  title: string,
  price: number,
  image: string | null,
): Product {
  return {
    id: uuidFromSeed(`${storeId}:${title}`),
    storeId,
    title,
    shortDescription: null,
    attributes: {},
    price,
    mrp: null,
    images: image ? [image] : [],
    isAvailable: true,
    unitsSoldCount: 0,
  };
}

function parseProductRecord(value: unknown, fallbackStoreId: string): Product | null {
  if (!isRecord(value)) {
    return null;
  }
  const title = asString(value.title);
  const price = asNumber(value.price);
  const storeId = asString(value.store_id) ?? asString(value.storeId) ?? fallbackStoreId;
  if (!title || price === null) {
    return null;
  }
  const id = asString(value.id) ?? uuidFromSeed(`${storeId}:${title}`);
  const attributesRaw = value.attributes;
  const attributes: Record<string, string> = {};
  if (isRecord(attributesRaw)) {
    for (const [key, entry] of Object.entries(attributesRaw)) {
      if (typeof entry === "string") {
        attributes[key] = entry;
      }
    }
  }
  const images = Array.isArray(value.images)
    ? value.images.filter((item): item is string => typeof item === "string")
    : [];
  return {
    id,
    storeId,
    title,
    shortDescription: asString(value.short_description) ?? asString(value.shortDescription),
    attributes,
    price,
    mrp: asNumber(value.mrp),
    images,
    isAvailable: asBoolean(value.is_available, true),
    unitsSoldCount: asNumber(value.units_sold_count) ?? 0,
  };
}

function parseCatalogStore(value: unknown): { store: Store; products: Product[] } | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = asString(value.id);
  const name = asString(value.name);
  const slug = asString(value.slug);
  const businessType = asString(value.business_type) ?? asString(value.businessType);
  const category = asString(value.category);
  const address = asString(value.address);
  const whatsapp = asString(value.whatsapp_number) ?? asString(value.whatsappNumber);
  if (!id || !name || !slug || !businessType || !category || !address || !whatsapp) {
    return null;
  }
  const tagsRaw = value.service_tags ?? value.serviceTags;
  const serviceTags = Array.isArray(tagsRaw)
    ? tagsRaw.filter((tag): tag is string => typeof tag === "string")
    : [];
  const store: Store = {
    id,
    ownerId: asString(value.owner_id) ?? asString(value.ownerId) ?? "",
    name,
    slug,
    businessType: businessType === "service" ? "service" : "retail",
    category,
    serviceTags,
    visitingCharge: asNumber(value.visiting_charge) ?? asNumber(value.visitingCharge),
    latitude: asNumber(value.latitude) ?? 0,
    longitude: asNumber(value.longitude) ?? 0,
    address,
    landmark: asString(value.landmark),
    whatsappNumber: whatsapp,
    allowsPickup: asBoolean(value.allows_pickup ?? value.allowsPickup, true),
    allowsSelfDelivery: asBoolean(
      value.allows_self_delivery ?? value.allowsSelfDelivery,
      false,
    ),
    deliveryRadiusKm: asNumber(value.delivery_radius_km) ?? asNumber(value.deliveryRadiusKm) ?? 3,
    isTakingOrders: asBoolean(value.is_taking_orders ?? value.isTakingOrders, true),
    completedOrdersCount:
      asNumber(value.completed_orders_count) ?? asNumber(value.completedOrdersCount) ?? 0,
    isActive: asBoolean(value.is_active ?? value.isActive, true),
    isSponsored: asBoolean(value.is_sponsored ?? value.isSponsored, false),
    sponsoredUntil: asString(value.sponsored_until) ?? asString(value.sponsoredUntil),
  };
  const productsRaw = value.products;
  const products = Array.isArray(productsRaw)
    ? productsRaw
        .map((row) => parseProductRecord(row, store.id))
        .filter((row): row is Product => row !== null && row.isAvailable)
    : [];
  return { store, products };
}

async function rpcSearch(
  userLat: number,
  userLng: number,
  radiusKm: number,
  searchTerm: string,
  targetType: BusinessType,
): Promise<SearchRpcRow[]> {
  const supabase = await createClient();
  if (!supabase) {
    return [];
  }
  const { data, error } = await supabase.rpc("search_neighborhood_entities", {
    user_lat: userLat,
    user_lng: userLng,
    radius_km: radiusKm,
    search_term: searchTerm,
    target_type: targetType,
  });
  if (error || !Array.isArray(data)) {
    return [];
  }
  return data
    .map((row) => parseSearchRow(row))
    .filter((row): row is SearchRpcRow => row !== null);
}

async function loadLiveProducts(storeId: string, originLat: number, originLng: number): Promise<Product[]> {
  const supabase = await createClient();
  if (!supabase) {
    return [];
  }

  const { data: tableRows } = await supabase
    .from("products")
    .select(
      "id, store_id, title, short_description, attributes, price, mrp, images, is_available, units_sold_count",
    )
    .eq("store_id", storeId)
    .eq("is_available", true);

  const fromTable = Array.isArray(tableRows)
    ? tableRows
        .map((row) => parseProductRecord(row, storeId))
        .filter((row): row is Product => row !== null)
    : [];
  if (fromTable.length > 0) {
    return fromTable;
  }

  const found = new Map<string, Product>();
  for (const term of PRODUCT_PROBE_TERMS) {
    const rows = await rpcSearch(originLat, originLng, 0, term, "retail");
    for (const row of rows) {
      if (row.id !== storeId || !row.matched_product_title || row.matched_product_price === null) {
        continue;
      }
      const price = asNumber(row.matched_product_price);
      if (price === null) {
        continue;
      }
      const product = productFromMatch(
        storeId,
        row.matched_product_title,
        price,
        row.matched_product_image,
      );
      found.set(product.title, product);
    }
  }
  return [...found.values()];
}

function listingSearchText(store: Store, products: Product[], extra: string | null): string {
  return [store.name, store.category, ...store.serviceTags, ...products.map((p) => p.title), extra ?? ""]
    .join(" ")
    .toLowerCase();
}

function mockSearch(options: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  searchTerm: string;
  businessType: BusinessType;
}): NeighborhoodListing[] {
  function fuzzyIncludes(haystack: string, needle: string): boolean {
    return haystack.toLowerCase().includes(needle.toLowerCase());
  }

  return MOCK_STORES.filter((store) => {
    if (!store.isActive || store.businessType !== options.businessType) {
      return false;
    }
    const products = MOCK_PRODUCTS.filter((product) => product.storeId === store.id);
    const distance = distanceMeters(
      options.latitude,
      options.longitude,
      store.latitude,
      store.longitude,
    );
    if (options.radiusKm > 0 && distance > options.radiusKm * 1000) {
      return false;
    }
    const term = options.searchTerm;
    if (!term.trim()) {
      return true;
    }
    if (fuzzyIncludes(store.name, term) || fuzzyIncludes(store.category, term)) {
      return true;
    }
    if (store.serviceTags.some((tag) => fuzzyIncludes(tag, term))) {
      return true;
    }
    return products.some((product) => fuzzyIncludes(product.title, term));
  })
    .map((store) => {
      const products = MOCK_PRODUCTS.filter(
        (product) => product.storeId === store.id && product.isAvailable,
      );
      const match = options.searchTerm.trim()
        ? products.find((product) =>
            product.title.toLowerCase().includes(options.searchTerm.toLowerCase()),
          )
        : undefined;
      return {
        store,
        distanceMeters: distanceMeters(
          options.latitude,
          options.longitude,
          store.latitude,
          store.longitude,
        ),
        matchedProductTitle: match?.title ?? null,
        matchedProductPrice: match?.price ?? null,
        searchText: listingSearchText(store, products, null),
        products,
      };
    })
    .sort((a, b) => {
      const aSponsored = a.store.isSponsored ? 1 : 0;
      const bSponsored = b.store.isSponsored ? 1 : 0;
      if (aSponsored !== bSponsored) {
        return bSponsored - aSponsored;
      }
      return a.distanceMeters - b.distanceMeters;
    });
}

export async function searchNeighborhood(options: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  searchTerm?: string;
  businessType: BusinessType;
}): Promise<NeighborhoodListing[]> {
  const term = options.searchTerm ?? "";

  if (isUsingMockCatalog()) {
    return mockSearch({ ...options, searchTerm: term });
  }

  let rows = await rpcSearch(
    options.latitude,
    options.longitude,
    options.radiusKm,
    term,
    options.businessType,
  );
  if (rows.length === 0 && options.radiusKm > 0) {
    rows = await rpcSearch(options.latitude, options.longitude, 0, term, options.businessType);
  }

  const listings: NeighborhoodListing[] = [];
  for (const row of rows) {
    const store = storeFromSearchRow(row, options.latitude, options.longitude);
    const products =
      store.businessType === "retail"
        ? await loadLiveProducts(store.id, options.latitude, options.longitude)
        : [];
    listings.push({
      store,
      distanceMeters: row.distance_meters,
      matchedProductTitle: row.matched_product_title,
      matchedProductPrice: asNumber(row.matched_product_price),
      searchText: listingSearchText(store, products, row.matched_product_title),
      products,
    });
  }

  return listings.sort((a, b) => {
    const aSponsored = a.store.isSponsored ? 1 : 0;
    const bSponsored = b.store.isSponsored ? 1 : 0;
    if (aSponsored !== bSponsored) {
      return bSponsored - aSponsored;
    }
    return a.distanceMeters - b.distanceMeters;
  });
}

export async function getStoreBySlug(slug: string): Promise<Store | null> {
  if (!isUsingMockCatalog()) {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase.rpc("get_store_catalog", { p_slug: slug });
      const parsed = parseCatalogStore(data);
      if (parsed) {
        return parsed.store;
      }
    }
    const [shops, services] = await Promise.all([
      searchNeighborhood({
        latitude: 17.4486,
        longitude: 78.3908,
        radiusKm: 0,
        businessType: "retail",
      }),
      searchNeighborhood({
        latitude: 17.4486,
        longitude: 78.3908,
        radiusKm: 0,
        businessType: "service",
      }),
    ]);
    const listing = [...shops, ...services].find((row) => row.store.slug === slug);
    if (listing) {
      return listing.store;
    }
  }
  return MOCK_STORES.find((store) => store.slug === slug) ?? null;
}

export async function getStoreById(id: string): Promise<Store | null> {
  const fromMock = MOCK_STORES.find((store) => store.id === id) ?? null;
  if (isUsingMockCatalog()) {
    return fromMock;
  }
  const [shops, services] = await Promise.all([
    searchNeighborhood({
      latitude: 17.4486,
      longitude: 78.3908,
      radiusKm: 0,
      businessType: "retail",
    }),
    searchNeighborhood({
      latitude: 17.4486,
      longitude: 78.3908,
      radiusKm: 0,
      businessType: "service",
    }),
  ]);
  return [...shops, ...services].find((row) => row.store.id === id)?.store ?? fromMock;
}

export async function getProductsForStore(storeId: string): Promise<Product[]> {
  if (!isUsingMockCatalog()) {
    const live = await loadLiveProducts(storeId, 17.4486, 78.3908);
    if (live.length > 0) {
      return live;
    }
    const supabase = await createClient();
    if (supabase) {
      const store = await getStoreById(storeId);
      if (store) {
        const { data } = await supabase.rpc("get_store_catalog", { p_slug: store.slug });
        const parsed = parseCatalogStore(data);
        if (parsed && parsed.products.length > 0) {
          return parsed.products;
        }
      }
    }
  }
  return MOCK_PRODUCTS.filter(
    (product) => product.storeId === storeId && product.isAvailable,
  );
}
