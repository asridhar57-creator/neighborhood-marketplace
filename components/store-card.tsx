import Link from "next/link";
import { MapPin, Star } from "lucide-react";

import { ShareWhatsAppButton } from "@/components/share-whatsapp-button";
import { Badge } from "@/components/ui/badge";
import { formatDistance, formatInr } from "@/lib/format";
import type { NeighborhoodListing } from "@/lib/types";

export function StoreCard({ listing }: { listing: NeighborhoodListing }) {
  const { store } = listing;
  const isService = store.businessType === "service";

  return (
    <article className="rounded-2xl border border-stone-200/90 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/stores/${store.slug}`} className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-stone-900">{store.name}</h2>
          <p className="text-sm text-stone-600">{store.category}</p>
        </Link>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {store.isSponsored ? (
            <Badge variant="secondary">
              <Star className="size-3" />
              Nearby pick
            </Badge>
          ) : null}
          {!store.isTakingOrders && !isService ? (
            <Badge variant="outline">Counter closed</Badge>
          ) : null}
          <ShareWhatsAppButton
            headline={`${store.name} · ${store.category}`}
            path={`/stores/${store.slug}`}
          />
        </div>
      </div>
      <Link href={`/stores/${store.slug}`} className="mt-2 flex flex-col gap-2 text-sm text-stone-600">
        <p className="flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" />
          <span>
            {formatDistance(listing.distanceMeters)}
            {store.landmark ? ` · ${store.landmark}` : ""}
          </span>
        </p>
        {isService && store.visitingCharge !== null ? (
          <p>Visit from {formatInr(store.visitingCharge)}</p>
        ) : null}
        {listing.matchedProductTitle && listing.matchedProductPrice !== null ? (
          <p className="text-stone-900">
            {listing.matchedProductTitle} · {formatInr(listing.matchedProductPrice)}
          </p>
        ) : null}
        {!isService && store.allowsSelfDelivery ? (
          <p>Pickup or doorstep. Pay cash or UPI there.</p>
        ) : null}
        {!isService && !store.allowsSelfDelivery ? (
          <p>Pickup at the counter. Pay cash or UPI there.</p>
        ) : null}
        {isService ? (
          <p>Call or WhatsApp. No bag, no online payment.</p>
        ) : null}
      </Link>
    </article>
  );
}
