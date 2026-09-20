"use client";

import { useSellerUi } from "@/lib/store/use-seller-ui";

export function HomeHero({ mockBanner }: { mockBanner: boolean }) {
  const openSeller = useSellerUi((state) => state.openSeller);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-pretty text-stone-900">
          Everything in Madhapur, directly from your neighborhood.
        </h1>
        <p className="mt-2 text-sm text-pretty text-stone-600">
          Trusted local shops and verified pros. Zero commissions. You pay them
          directly — UPI or cash at the counter or doorstep.
        </p>
      </div>
      {mockBanner ? (
        <p className="rounded-lg bg-stone-200/70 px-3 py-2 text-xs text-stone-700">
          Running on local neighborhood data. Add Supabase keys later for live
          PostGIS search — the app does not need them to work.
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          href="#listings"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-stone-900 px-4 text-sm font-medium text-stone-50"
        >
          Explore Shops & Services
        </a>
        <button
          type="button"
          onClick={() => openSeller()}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium text-stone-900"
        >
          List Your Business Free →
        </button>
      </div>
    </section>
  );
}
