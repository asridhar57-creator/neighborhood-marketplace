"use client";

import Link from "next/link";
import { ShoppingBag, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHasHydrated } from "@/hooks/use-has-hydrated";
import { selectBagCount, useCart } from "@/lib/store/use-cart";

export function SiteHeader({ neighborhood }: { neighborhood: string }) {
  const hydrated = useHasHydrated();
  const items = useCart((state) => state.items);
  const count = hydrated ? selectBagCount(items) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-stone-500 uppercase">
            Neighborhood
          </p>
          <p className="truncate text-base font-semibold text-stone-900">
            {neighborhood}
          </p>
        </Link>
        <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="lg"
          nativeButton={false}
          render={<Link href="/merchant/dashboard" />}
          className="h-10 px-2"
        >
          <Store className="size-4" />
          <span className="hidden sm:inline">Counter</span>
        </Button>
        <Button
          variant="outline"
          size="lg"
          nativeButton={false}
          render={<Link href="/bag" />}
          className="relative h-10 gap-2 px-3"
        >
          <ShoppingBag className="size-4" />
          <span>Bag</span>
          {count > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-stone-800 text-[10px] font-semibold text-stone-50">
              {count}
            </span>
          ) : null}
        </Button>
        </div>
      </div>
    </header>
  );
}
