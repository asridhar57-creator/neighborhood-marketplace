"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/store/use-cart";

export function CartReplaceModal() {
  const pendingReplace = useCart((state) => state.pendingReplace);
  const conflictStoreName = useCart((state) => state.conflictStoreName);
  const confirmReplaceCart = useCart((state) => state.confirmReplaceCart);
  const cancelReplaceCart = useCart((state) => state.cancelReplaceCart);

  const storeTwo = pendingReplace?.storeName ?? "this shop";
  const storeOne = conflictStoreName ?? "your current shop";

  return (
    <Sheet
      open={pendingReplace !== null}
      onOpenChange={(open) => {
        if (!open) {
          cancelReplaceCart();
        }
      }}
    >
      <SheetContent
        side="bottom"
        className="mx-auto max-w-3xl rounded-t-2xl pb-6"
      >
        <SheetHeader>
          <SheetTitle>Order directly from {storeTwo}?</SheetTitle>
          <SheetDescription>
            Each shop on this street is independent. Your bag can hold items from
            only one counter at a time.
          </SheetDescription>
        </SheetHeader>
        <SheetFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="h-11"
            onClick={() => cancelReplaceCart()}
          >
            Keep {storeOne} Bag
          </Button>
          <Button className="h-11" onClick={() => confirmReplaceCart()}>
            Switch to {storeTwo}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
