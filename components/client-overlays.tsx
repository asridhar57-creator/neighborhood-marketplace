"use client";

import { ActiveOrderChrome } from "@/components/active-order-chrome";
import { BecomeSellerSheet } from "@/components/become-seller-sheet";

export function ClientOverlays() {
  return (
    <>
      <ActiveOrderChrome />
      <BecomeSellerSheet />
    </>
  );
}
