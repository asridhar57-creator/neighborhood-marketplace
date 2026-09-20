"use client";

import { BagCheckout } from "@/components/bag-checkout";
import { useHasHydrated } from "@/hooks/use-has-hydrated";
import { MOCK_STORES } from "@/lib/mock-data";
import { useCartStore } from "@/stores/cart-store";

export function BagPageClient() {
  const hydrated = useHasHydrated();
  const storeId = useCartStore((state) => state.storeId);
  const store = MOCK_STORES.find((row) => row.id === storeId) ?? null;
  if (!hydrated) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Loading your bag…
      </p>
    );
  }
  return <BagCheckout store={store} />;
}
