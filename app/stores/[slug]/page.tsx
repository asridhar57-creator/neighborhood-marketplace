import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin } from "lucide-react";

import { ContactActions } from "@/components/contact-actions";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { getProductsForStore, getStoreBySlug } from "@/lib/catalog";
import { formatInr } from "@/lib/format";

type StorePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: StorePageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) {
    return { title: "Not found" };
  }
  return {
    title: store.name,
    description: `${store.category} in ${store.address}`,
  };
}

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) {
    notFound();
  }

  const products = await getProductsForStore(store.id);
  const isService = store.businessType === "service";

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {isService ? "Service" : "Retail"}
          </Badge>
          <Badge variant="outline">{store.category}</Badge>
          {store.isSponsored ? (
            <Badge>
              <BadgeCheck className="size-3" />
              Nearby pick
            </Badge>
          ) : null}
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{store.name}</h1>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            {store.address}
            {store.landmark ? ` · ${store.landmark}` : ""}
          </p>
        </div>
        {isService ? (
          <p className="text-sm text-stone-700">
            Visiting charge from{" "}
            {store.visitingCharge !== null
              ? formatInr(store.visitingCharge)
              : "the technician"}
            . Call or WhatsApp to book — this profile has no Add to bag.
          </p>
        ) : (
          <p className="text-sm text-stone-700">
            {store.isTakingOrders
              ? "Add from this shop only. Pay cash or UPI at pickup or the door."
              : "The counter is not taking bag orders right now. You can still call."}
          </p>
        )}
        {isService && store.serviceTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {store.serviceTags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
        <ContactActions store={store} />
      </section>

      {isService ? null : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-10 text-center">
          <p className="font-medium">No products listed yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This shop can list up to 15 active items.
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium tracking-wide text-stone-500 uppercase">
            Featured Items
          </h2>
          {products.map((product) => (
            <ProductCard key={product.id} store={store} product={product} />
          ))}
        </section>
      )}
    </div>
  );
}
