import type { Metadata } from "next";

import { BagPageClient } from "@/components/bag-page-client";

export const metadata: Metadata = {
  title: "Bag",
};

export default function BagPage() {
  return <BagPageClient />;
}
