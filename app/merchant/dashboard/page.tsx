import type { Metadata } from "next";
import Link from "next/link";

import { getMerchantDashboardOrders } from "@/app/actions/orders";
import { MerchantPinDialog } from "@/components/merchant-pin-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInr } from "@/lib/format";

export const metadata: Metadata = {
  title: "Counter",
};

export default async function MerchantDashboardPage() {
  const { usingMock, orders } = await getMerchantDashboardOrders();
  const open = orders.filter(
    (order) => order.status !== "completed" && order.status !== "cancelled",
  );
  const done = orders.filter((order) => order.status === "completed");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your counter</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm handover with the customer’s 4-digit PIN. Money stays cash or
          UPI at the counter or door — never in the app.
        </p>
      </div>
      {usingMock ? (
        <p className="rounded-lg bg-stone-200/70 px-3 py-2 text-xs text-stone-700">
          Local mock counter. Place a bag order on this server, then verify the
          PIN here. Live shops use Supabase auth and{" "}
          <code>verify_order_pin_atomic</code>.
        </p>
      ) : null}
      {open.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-10 text-center">
          <p className="font-medium">No open orders</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When a neighbor places a bag, it lands here for PIN handover.
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/" />}
            className="mt-4"
          >
            Neighborhood home
          </Button>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium tracking-wide text-stone-500 uppercase">
            Waiting for PIN
          </h2>
          {open.map((order) => (
            <Card key={order.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>{order.storeName}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatInr(order.totalAmount)} ·{" "}
                    {order.fulfillmentType === "pickup" ? "Pickup" : "Doorstep"}
                  </p>
                </div>
                <Badge variant="secondary">{order.status}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Ask for the PIN on their phone. Do not guess it from this
                  screen.
                </p>
                <MerchantPinDialog order={order} />
              </CardContent>
            </Card>
          ))}
        </section>
      )}
      {done.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium tracking-wide text-stone-500 uppercase">
            Completed today
          </h2>
          {done.map((order) => (
            <p key={order.id} className="text-sm text-muted-foreground">
              {order.storeName} · {formatInr(order.totalAmount)} · handed over
            </p>
          ))}
        </section>
      ) : null}
    </div>
  );
}
