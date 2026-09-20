"use client";

import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/store/use-cart";
import type { Product, Store } from "@/lib/types";

export function AddToBagButton({
  store,
  product,
}: {
  store: Store;
  product: Product;
}) {
  const addItem = useCart((state) => state.addItem);

  if (store.businessType !== "retail") {
    return null;
  }

  if (!store.isTakingOrders) {
    return (
      <Button size="lg" disabled className="h-10 bg-stone-300 text-stone-600">
        Counter closed
      </Button>
    );
  }

  if (!product.isAvailable) {
    return (
      <Button size="lg" disabled className="h-10">
        Out of stock
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      className="h-10 gap-1.5 bg-stone-900 text-stone-50 hover:bg-stone-800"
      onClick={() => {
        addItem({
          productId: product.id,
          storeId: store.id,
          storeName: store.name,
          title: product.title,
          unitPrice: product.price,
        });
      }}
    >
      <ShoppingBag className="size-4" />
      Add
    </Button>
  );
}
