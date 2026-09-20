import { AddToBagButton } from "@/components/add-to-bag-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInr } from "@/lib/format";
import type { Product, Store } from "@/lib/types";

export function ProductCard({
  store,
  product,
}: {
  store: Store;
  product: Product;
}) {
  const hasDiscount =
    product.mrp !== null && product.mrp > product.price;

  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{product.title}</CardTitle>
          {product.shortDescription ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {product.shortDescription}
            </p>
          ) : null}
        </div>
        {product.attributes.pack ? (
          <Badge variant="outline">{product.attributes.pack}</Badge>
        ) : null}
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{formatInr(product.price)}</p>
          {hasDiscount && product.mrp !== null ? (
            <p className="text-xs text-muted-foreground line-through">
              {formatInr(product.mrp)}
            </p>
          ) : null}
        </div>
        <AddToBagButton store={store} product={product} />
      </CardContent>
    </Card>
  );
}
