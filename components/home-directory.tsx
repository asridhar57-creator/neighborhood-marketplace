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

const CHIPS = [
  "All",
  "Groceries",
  "Sweets & Bakery",
  "Pharmacy",
  "Electrician & Repairs",
  "Plumbing",
] as const;

type Chip = (typeof CHIPS)[number];

export function HomeDirectory({ shops, services }: HomeDirectoryProps) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<Chip>("All");
  const [tab, setTab] = useState("retail");

  const filteredShops = useMemo(
    () => filterListings(shops, query, chip),
    [shops, query, chip],
  );
  const filteredServices = useMemo(
    () => filterListings(services, query, chip),
    [services, query, chip],
  );

  return (
    <div id="listings" className="flex scroll-mt-28 flex-col gap-4">
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

      <div className="sticky top-[57px] z-30 -mx-4 border-b border-stone-200/80 bg-stone-50/95 px-4 py-2 backdrop-blur-md">
        <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CHIPS.map((row) => {
            const selected = chip === row;
            return (
              <button
                key={row}
                type="button"
                onClick={() => {
                  setChip(row);
                  if (row === "Electrician & Repairs" || row === "Plumbing") {
                    setTab("service");
                  } else if (row !== "All") {
                    setTab("retail");
                  }
                }}
                className={
                  selected
                    ? "shrink-0 rounded-full bg-stone-900 px-3 py-1.5 text-sm font-medium text-stone-50"
                    : "shrink-0 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700"
                }
              >
                {row}
              </button>
            );
          })}
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (typeof value === "string") {
            setTab(value);
          }
        }}
        className="gap-4"
      >
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
                    distanceMeters={listing.distanceMeters}
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

function chipMatches(listing: NeighborhoodListing, chip: Chip): boolean {
  if (chip === "All") {
    return true;
  }
  const haystack = `${listing.store.category} ${listing.store.name} ${listing.searchText} ${listing.store.serviceTags.join(" ")}`.toLowerCase();
  if (chip === "Groceries") {
    return /kirana|groc|dairy|vegetable|atta|milk|egg/.test(haystack);
  }
  if (chip === "Sweets & Bakery") {
    return /sweet|bakery|mithai|cake/.test(haystack);
  }
  if (chip === "Pharmacy") {
    return /pharm|chemist|medical/.test(haystack);
  }
  if (chip === "Electrician & Repairs") {
    return /electric|repair|wiring|fan/.test(haystack);
  }
  if (chip === "Plumbing") {
    return /plumb|tap|leak|pipe/.test(haystack);
  }
  return true;
}

function filterListings(
  listings: NeighborhoodListing[],
  query: string,
  chip: Chip,
): NeighborhoodListing[] {
  const term = query.trim().toLowerCase();
  return listings.filter((listing) => {
    if (!chipMatches(listing, chip)) {
      return false;
    }
    if (!term) {
      return true;
    }
    return listing.searchText.includes(term);
  });
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-10 text-center">
      <p className="font-medium text-stone-900">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
