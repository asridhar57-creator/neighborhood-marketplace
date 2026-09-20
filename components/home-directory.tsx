"use client";

import { useMemo, useState } from "react";
import { Search, Store, Wrench } from "lucide-react";

import { ProductCard } from "@/components/product-card";
import { StoreCard } from "@/components/store-card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NeighborhoodListing } from "@/lib/types";

type HomeDirectoryProps = {
  shops: NeighborhoodListing[];
  services: NeighborhoodListing[];
};

export function HomeDirectory({ shops, services }: HomeDirectoryProps) {
  const [query, setQuery] = useState("");

  const filteredShops = useMemo(
    () => filterListings(shops, query),
    [shops, query],
  );
  const filteredServices = useMemo(
    () => filterListings(services, query),
    [services, query],
  );

  return (
    <div className="flex flex-col gap-4">
      <label className="relative block">
        <span className="sr-only">Search shops and services</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search atta, electrician, milk…"
          className="h-11 bg-white pl-9 text-base"
        />
      </label>

      <Tabs defaultValue="retail" className="gap-4">
        <TabsList className="grid h-11 w-full grid-cols-2">
          <TabsTrigger value="retail" className="gap-1.5">
            <Store className="size-4" />
            Shops & Products
          </TabsTrigger>
          <TabsTrigger value="service" className="gap-1.5">
            <Wrench className="size-4" />
            Services
          </TabsTrigger>
        </TabsList>
        <TabsContent value="retail" className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Curated kirana, dairy, and chemist counters. Add to bag from one shop
            at a time. Pay at pickup or the door.
          </p>
          {filteredShops.length === 0 ? (
            <EmptyState
              title="No shops match that search"
              body="Try a product name or a shop category — atta, dairy, chemist."
            />
          ) : (
            filteredShops.map((listing) => (
              <div key={listing.store.id} className="flex flex-col gap-2">
                <StoreCard listing={listing} />
                {listing.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    store={listing.store}
                    product={product}
                  />
                ))}
              </div>
            ))
          )}
        </TabsContent>
        <TabsContent value="service" className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Electricians, plumbers, and home salon. Call or WhatsApp only — no
            shopping bag.
          </p>
          {filteredServices.length === 0 ? (
            <EmptyState
              title="No services match that search"
              body="Try a job — wiring, leak, haircut — or a name."
            />
          ) : (
            filteredServices.map((listing) => (
              <StoreCard key={listing.store.id} listing={listing} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function filterListings(
  listings: NeighborhoodListing[],
  query: string,
): NeighborhoodListing[] {
  const term = query.trim().toLowerCase();
  if (!term) {
    return listings;
  }
  return listings.filter((listing) => listing.searchText.includes(term));
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-10 text-center">
      <p className="font-medium text-stone-900">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
