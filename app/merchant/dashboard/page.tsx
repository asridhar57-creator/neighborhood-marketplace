import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Counter",
};

export default async function MerchantDashboardPage() {
  redirect("/counter");
}
