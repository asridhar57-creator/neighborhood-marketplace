import { AddToBagButton } from "@/components/add-to-bag-button";
import { ShareWhatsAppButton } from "@/components/share-whatsapp-button";
import { Badge } from "@/components/ui/badge";
import { formatDistance, formatInr } from "@/lib/format";
import type { Product, Store } from "@/lib/types";

export function ProductCard({
  store,
  product,
  distanceMeters,
}: {
  store: Store;
  product: Product;
  distanceMeters?: number;
}) {
  const hasDiscount = product.mrp !== null && product.mrp > product.price;

  return (
    <article className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-stone-900">{product.title}</h3>
          {product.shortDescription ? (
            <p className="mt-1 text-sm text-stone-600">{product.shortDescription}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {typeof distanceMeters === "number" ? (
            <Badge variant="secondary">{formatDistance(distanceMeters)}</Badge>
          ) : null}
          {product.attributes.pack ? (
            <Badge variant="outline">{product.attributes.pack}</Badge>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-lg font-bold tracking-tight text-stone-900">
            {formatInr(product.price)}
          </p>
          {hasDiscount && product.mrp !== null ? (
            <p className="text-sm text-stone-500 line-through">
              {formatInr(product.mrp)}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <ShareWhatsAppButton
            headline={`${product.title} at ${store.name}`}
            path={`/stores/${store.slug}`}
          />
          <AddToBagButton store={store} product={product} />
        </div>
      </div>
    </article>
  );
}
