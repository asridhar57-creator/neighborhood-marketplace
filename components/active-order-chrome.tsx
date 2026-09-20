"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatInr, formatWhatsAppLink } from "@/lib/format";
import {
  useActiveOrder,
  type ActiveOrderSnapshot,
} from "@/lib/store/use-active-order";

function isBuyerPath(pathname: string): boolean {
  return !pathname.startsWith("/merchant") && !pathname.startsWith("/counter");
}

export function ActiveOrderChrome() {
  const pathname = usePathname();
  const order = useActiveOrder((state) => state.order);
  const [mounted, setMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(useActiveOrder.persist.rehydrate())
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setMounted(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mounted || !order || !isBuyerPath(pathname)) {
    return null;
  }

  const readyLabel =
    order.fulfillment_type === "self_delivery"
      ? "Doorstep Delivery"
      : "Ready for Pickup";

  return (
    <>
      <div className="h-16" aria-hidden />
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-3 rounded-full bg-stone-900 px-4 py-3 text-left text-stone-50 shadow-lg"
        >
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            Active Order at {order.store_name}
          </span>
          <span className="font-mono text-sm font-semibold tracking-widest">
            {order.verification_pin}
          </span>
          <span className="shrink-0 text-sm font-medium text-stone-300">
            Track →
          </span>
        </button>
      </div>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-3xl rounded-t-2xl pb-6"
        >
          <ActiveOrderSheetBody
            order={order}
            readyLabel={readyLabel}
            onDismiss={() => {
              useActiveOrder.getState().clearOrder();
              setSheetOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

function ActiveOrderSheetBody({
  order,
  readyLabel,
  onDismiss,
}: {
  order: ActiveOrderSnapshot;
  readyLabel: string;
  onDismiss: () => void;
}) {
  const shopMessage = `Hi ${order.store_name}, my Madhapur Marketplace PIN is ${order.verification_pin}.`;
  const shopHref = order.whatsapp_number
    ? formatWhatsAppLink(order.whatsapp_number, shopMessage)
    : `https://wa.me/?text=${encodeURIComponent(shopMessage)}`;

  return (
    <>
      <SheetHeader>
        <SheetTitle>Active Order at {order.store_name}</SheetTitle>
        <SheetDescription>
          <span className="text-foreground">Placed</span>
          {" ➔ "}
          {readyLabel}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4">
        <div className="rounded-xl bg-stone-900 px-4 py-5 text-center text-stone-50">
          <p className="text-xs tracking-[0.28em] text-stone-400 uppercase">
            PIN
          </p>
          <p className="mt-1 font-mono text-4xl font-bold tracking-[0.28em]">
            {order.verification_pin}
          </p>
          <p className="mt-2 text-sm text-stone-300">
            {formatInr(order.total_amount)} · {order.status}
          </p>
        </div>
        <Button
          size="lg"
          className="h-11"
          nativeButton={false}
          render={<a href={shopHref} />}
        >
          WhatsApp Shop
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-11"
          nativeButton={false}
          render={<Link href={`/orders/${order.order_id}`} />}
        >
          Open tracking page
        </Button>
      </div>
      <SheetFooter>
        <Button variant="ghost" className="h-11" onClick={onDismiss}>
          Received / Dismiss
        </Button>
      </SheetFooter>
    </>
  );
}
