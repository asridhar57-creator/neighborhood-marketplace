"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from "@/lib/store/use-cart";

export function CartReplaceModal() {
  const pendingReplace = useCart((state) => state.pendingReplace);
  const conflictStoreName = useCart((state) => state.conflictStoreName);
  const confirmReplaceCart = useCart((state) => state.confirmReplaceCart);
  const cancelReplaceCart = useCart((state) => state.cancelReplaceCart);

  return (
    <Dialog
      open={pendingReplace !== null}
      onOpenChange={(open) => {
        if (!open) {
          cancelReplaceCart();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace this bag?</DialogTitle>
          <DialogDescription>
            Your bag already has items from {conflictStoreName}. The cart can
            only hold one shop at a time. Empty it and add{" "}
            {pendingReplace?.title} from {pendingReplace?.storeName} instead?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => cancelReplaceCart()}>
            Keep current bag
          </Button>
          <Button onClick={() => confirmReplaceCart()}>
            Switch to {pendingReplace?.storeName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
