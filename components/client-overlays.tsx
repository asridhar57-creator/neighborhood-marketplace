"use client";

import dynamic from "next/dynamic";

const ActiveOrderChrome = dynamic(
  () =>
    import("@/components/active-order-chrome").then(
      (mod) => mod.ActiveOrderChrome,
    ),
  { ssr: false },
);

const BecomeSellerSheet = dynamic(
  () =>
    import("@/components/become-seller-sheet").then(
      (mod) => mod.BecomeSellerSheet,
    ),
  { ssr: false },
);

export function ClientOverlays() {
  return (
    <>
      <ActiveOrderChrome />
      <BecomeSellerSheet />
    </>
  );
}
