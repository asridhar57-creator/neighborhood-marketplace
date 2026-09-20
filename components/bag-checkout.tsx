"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingBag } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatInr } from "@/lib/format";
import type { FulfillmentType, Store } from "@/lib/types";
import {
  selectBagTotal,
  useCartStore,
} from "@/stores/cart-store";

export function BagCheckout({ store }: { store: Store | null }) {
  const items = useCartStore((state) => state.items);
  const storeName = useCartStore((state) => state.storeName);
  const lastOrder = useCartStore((state) => state.lastOrder);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const clearBag = useCartStore((state) => state.clearBag);
  const placeOrder = useCartStore((state) => state.placeOrder);
  const [fulfillment, setFulfillment] = useState<FulfillmentType>("pickup");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => selectBagTotal(items), [items]);

  if (items.length === 0 && lastOrder) {
    return (
      <div className="flex flex-col gap-4">
        <Alert>
          <AlertTitle>Show this PIN at {lastOrder.storeName}</AlertTitle>
          <AlertDescription>
            Order placed. Pay cash or UPI at the{" "}
            {lastOrder.fulfillmentType === "pickup" ? "counter" : "doorstep"}.
            No card or app payment.
          </AlertDescription>
        </Alert>
        <div className="rounded-xl bg-stone-900 px-4 py-8 text-center text-stone-50">
          <p className="text-sm tracking-[0.3em] text-stone-400 uppercase">
            Verification PIN
          </p>
          <p className="mt-2 font-mono text-5xl font-semibold tracking-[0.35em]">
            {lastOrder.verificationPin}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Total {formatInr(lastOrder.totalAmount)} ·{" "}
          {lastOrder.items.length} line
          {lastOrder.items.length === 1 ? "" : "s"}
        </p>
        <Button nativeButton={false} render={<Link href="/" />} size="lg" className="h-11">
          Back to the neighborhood
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-16 text-center">
        <ShoppingBag className="mx-auto size-8 text-stone-400" />
        <p className="mt-3 font-medium">Your bag is empty</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add items from one kirana or dairy. Services never go in the bag.
        </p>
        <Button
          nativeButton={false}
          render={<Link href="/" />}
          className="mt-5 h-10"
          size="lg"
        >
          Browse shops
        </Button>
      </div>
    );
  }

  const canDeliver = store?.allowsSelfDelivery ?? false;
  const canPickup = store?.allowsPickup ?? true;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">Bag from</p>
        <h1 className="text-xl font-semibold">{storeName}</h1>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item.productId}
            className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-stone-200"
          >
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">
                {formatInr(item.unitPrice)} each
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setQuantity(item.productId, item.quantity - 1)}
                aria-label={`Fewer ${item.title}`}
              >
                <Minus />
              </Button>
              <span className="w-6 text-center text-sm font-medium">
                {item.quantity}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setQuantity(item.productId, item.quantity + 1)}
                aria-label={`More ${item.title}`}
              >
                <Plus />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="self-start text-sm text-stone-600 underline-offset-4 hover:underline"
        onClick={() => clearBag()}
      >
        Empty bag
      </button>
      <Separator />
      <div>
        <p className="mb-2 text-sm font-medium">How you’ll collect it</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={fulfillment === "pickup" ? "default" : "outline"}
            disabled={!canPickup}
            className="h-11"
            onClick={() => setFulfillment("pickup")}
          >
            Pickup
          </Button>
          <Button
            variant={fulfillment === "self_delivery" ? "default" : "outline"}
            disabled={!canDeliver}
            className="h-11"
            onClick={() => setFulfillment("self_delivery")}
          >
            Doorstep
          </Button>
        </div>
        {!canDeliver ? (
          <p className="mt-2 text-xs text-muted-foreground">
            This shop does not deliver. Collect at the counter.
          </p>
        ) : null}
      </div>
      {fulfillment === "self_delivery" ? (
        <label className="flex flex-col gap-1.5 text-sm">
          Doorstep address
          <Input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="House / floor, Ashoka Nagar"
            className="h-11 bg-white"
          />
        </label>
      ) : null}
      <Alert>
        <AlertTitle>Pay at the shop, not here</AlertTitle>
        <AlertDescription>
          Cash or UPI when you pick up or when they arrive. There is no Razorpay,
          Stripe, or in-app checkout.
        </AlertDescription>
      </Alert>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex items-center justify-between text-base font-semibold">
        <span>To pay later</span>
        <span>{formatInr(total)}</span>
      </div>
      <Button
        size="lg"
        className="h-12"
        onClick={() => {
          if (fulfillment === "self_delivery" && address.trim().length < 6) {
            setError("Add a doorstep address so they can find you.");
            return;
          }
          const order = placeOrder({
            fulfillmentType: fulfillment,
            deliveryAddress:
              fulfillment === "self_delivery" ? address.trim() : null,
          });
          if (!order) {
            setError("Could not place the order. Try again.");
          }
        }}
      >
        Place order · get PIN
      </Button>
    </div>
  );
}
