"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { verifyOrderPin } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { OrderRecord } from "@/lib/types";

export function MerchantPinDialog({ order }: { order: OrderRecord }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const disabled = order.status === "completed" || order.status === "cancelled";

  return (
    <>
      <Button
        size="lg"
        className="h-10"
        disabled={disabled}
        onClick={() => {
          setPin("");
          setError(null);
          setOpen(true);
        }}
      >
        {order.status === "completed" ? "Handed over" : "Verify PIN"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Handover PIN</DialogTitle>
            <DialogDescription>
              Ask the customer for their 4-digit PIN for {order.storeName}. Three
              wrong tries lock verification for 15 minutes.
            </DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-1.5 text-sm">
            PIN
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="••••"
              className="h-12 bg-white text-center font-mono text-2xl tracking-[0.4em]"
            />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || pin.length !== 4}
              onClick={() => {
                startTransition(() => {
                  void (async () => {
                    const result = await verifyOrderPin(order.id, pin);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setOpen(false);
                    router.refresh();
                  })();
                });
              }}
            >
              {pending ? "Checking…" : "Confirm handover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
