import type { Metadata } from "next";

import { MerchantCounter } from "@/components/merchant-counter";

export const metadata: Metadata = {
  title: "Counter",
};

export default async function CounterPage() {
  return <MerchantCounter />;
}
