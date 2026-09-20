"use client";

import { useEffect, useState } from "react";

import { loadStoreAction } from "@/app/actions/stores";
import { BagCheckout } from "@/components/bag-checkout";
import { useHasHydrated } from "@/hooks/use-has-hydrated";
import { useCart } from "@/lib/store/use-cart";
import type { Store } from "@/lib/types";

export function BagPageClient() {
  const hydrated = useHasHydrated();
  const storeId = useCart((state) => state.storeId);
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    if (!storeId) {
      setStore(null);
      return;
    }
    let cancelled = false;
    void loadStoreAction(storeId).then((loaded) => {
      if (!cancelled) {
        setStore(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  if (!hydrated) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Loading your bag…
      </p>
    );
  }
  return <BagCheckout store={store} />;
}
