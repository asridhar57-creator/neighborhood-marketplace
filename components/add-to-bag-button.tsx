"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCartStore } from "@/stores/cart-store";
import type { Product, Store } from "@/lib/types";

export function AddToBagButton({
  store,
  product,
}: {
  store: Store;
  product: Product;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const replaceStoreAndAdd = useCartStore((state) => state.replaceStoreAndAdd);
  const [conflictStore, setConflictStore] = useState<string | null>(null);

  if (store.businessType !== "retail") {
    return null;
  }

  if (!store.isTakingOrders) {
    return (
      <Button size="lg" disabled className="h-10">
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
    <>
      <Button
        size="lg"
        className="h-10 gap-1.5"
        onClick={() => {
          const result = addItem({
            productId: product.id,
            storeId: store.id,
            storeName: store.name,
            title: product.title,
            unitPrice: product.price,
          });
          if (result.status === "other-store") {
            setConflictStore(result.currentStoreName);
          }
        }}
      >
        <ShoppingBag className="size-4" />
        Add to bag
      </Button>
      <Dialog
        open={conflictStore !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConflictStore(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>One shop at a time</DialogTitle>
            <DialogDescription>
              Your bag already has items from {conflictStore}. Empty it and add
              this from {store.name} instead?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConflictStore(null)}>
              Keep current bag
            </Button>
            <Button
              onClick={() => {
                replaceStoreAndAdd({
                  productId: product.id,
                  storeId: store.id,
                  storeName: store.name,
                  title: product.title,
                  unitPrice: product.price,
                });
                setConflictStore(null);
              }}
            >
              Switch to {store.name}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
