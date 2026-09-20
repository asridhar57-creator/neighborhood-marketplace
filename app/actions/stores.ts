"use server";

import { getStoreById } from "@/lib/catalog";
import type { Store } from "@/lib/types";

export async function loadStoreAction(storeId: string): Promise<Store | null> {
  return getStoreById(storeId);
}
