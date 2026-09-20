import { distanceMeters } from "@/lib/geo";
import { MOCK_PRODUCTS, MOCK_STORES } from "@/lib/mock-data";
import { isUsingMockCatalog } from "@/lib/supabase/env";
import type { BusinessType, NeighborhoodListing, Product, Store } from "@/lib/types";

function fuzzyIncludes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function matchesSearch(store: Store, products: Product[], term: string): boolean {
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
}

function toListing(
  store: Store,
  originLat: number,
  originLng: number,
  products: Product[],
  term: string,
): NeighborhoodListing {
  const match = term.trim()
    ? products.find((product) => fuzzyIncludes(product.title, term))
    : undefined;
  return {
    store,
    distanceMeters: distanceMeters(
      originLat,
      originLng,
      store.latitude,
      store.longitude,
    ),
    matchedProductTitle: match?.title ?? null,
    matchedProductPrice: match?.price ?? null,
    searchText: [
      store.name,
      store.category,
      ...store.serviceTags,
      ...products.map((product) => product.title),
    ]
      .join(" ")
      .toLowerCase(),
  };
}

export async function searchNeighborhood(options: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  searchTerm?: string;
  businessType: BusinessType;
}): Promise<NeighborhoodListing[]> {
  const term = options.searchTerm ?? "";

  if (!isUsingMockCatalog()) {
    // Live PostGIS search is wired in a later slice. Until then, mock data keeps the PWA runnable.
  }

  const listings = MOCK_STORES.filter((store) => {
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
    return matchesSearch(store, products, term);
  }).map((store) =>
    toListing(
      store,
      options.latitude,
      options.longitude,
      MOCK_PRODUCTS.filter((product) => product.storeId === store.id),
      term,
    ),
  );

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
  return MOCK_STORES.find((store) => store.slug === slug) ?? null;
}

export async function getProductsForStore(storeId: string): Promise<Product[]> {
  return MOCK_PRODUCTS.filter(
    (product) => product.storeId === storeId && product.isAvailable,
  );
}
