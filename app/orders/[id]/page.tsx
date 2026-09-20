import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPinned } from "lucide-react";

import { getOrderPageData } from "@/app/actions/orders";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatInr, googleMapsNavigateUrl } from "@/lib/format";

type OrderPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: OrderPageProps): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderPageData(id);
  return { title: order ? `PIN for ${order.storeName}` : "Order" };
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  const order = await getOrderPageData(id);
  if (!order) {
    notFound();
  }

  const mapsUrl = googleMapsNavigateUrl({
    fulfillmentType: order.fulfillmentType,
    deliveryAddress: order.deliveryAddress,
    latitude: order.storeLatitude,
    longitude: order.storeLongitude,
    address: order.storeAddress,
  });

  const handover =
    order.fulfillmentType === "pickup"
      ? "the counter"
      : "the doorstep";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">Handover at {order.storeName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {order.status === "completed" ? "Order completed" : "Show this PIN"}
        </h1>
      </div>
      {order.status === "completed" ? (
        <Alert>
          <AlertTitle>Already handed over</AlertTitle>
          <AlertDescription>
            This order was completed at {handover}. Pay cash or UPI there if you
            have not already.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTitle>Pay cash or UPI at {handover}</AlertTitle>
          <AlertDescription>
            No card or app payment. The shop confirms with this PIN.
          </AlertDescription>
        </Alert>
      )}
      <div className="rounded-xl bg-stone-900 px-4 py-8 text-center text-stone-50">
        <p className="text-sm tracking-[0.3em] text-stone-400 uppercase">
          Verification PIN
        </p>
        <p className="mt-2 font-mono text-5xl font-semibold tracking-[0.35em]">
          {order.verificationPin}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        {formatInr(order.totalAmount)} · {order.storeAddress}
        {order.deliveryAddress ? ` · leave at ${order.deliveryAddress}` : ""}
      </p>
      <Button
        nativeButton={false}
        render={
          <a href={mapsUrl} target="_blank" rel="noreferrer" />
        }
        size="lg"
        className="h-12 gap-2"
      >
        <MapPinned className="size-4" />
        Navigate in Google Maps
      </Button>
    </div>
  );
}
