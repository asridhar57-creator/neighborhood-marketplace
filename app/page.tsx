import { cookies } from "next/headers";

import { HomeDirectory } from "@/components/home-directory";
import { searchNeighborhood } from "@/lib/catalog";
import { DEFAULT_NEIGHBORHOOD } from "@/lib/mock-data";
import { isUsingMockCatalog } from "@/lib/supabase/env";

export default async function HomePage() {
  const cookieStore = await cookies();
  const latitude = Number(
    cookieStore.get("lat")?.value ?? DEFAULT_NEIGHBORHOOD.latitude,
  );
  const longitude = Number(
    cookieStore.get("lng")?.value ?? DEFAULT_NEIGHBORHOOD.longitude,
  );

  const [shops, services] = await Promise.all([
    searchNeighborhood({
      latitude,
      longitude,
      radiusKm: 5,
      businessType: "retail",
    }),
    searchNeighborhood({
      latitude,
      longitude,
      radiusKm: 5,
      businessType: "service",
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          What’s around {DEFAULT_NEIGHBORHOOD.name}
        </h1>
        <p className="mt-1 text-sm text-pretty text-stone-600">
          Retail shops take a bag. Service people take a call. Everything settles
          in cash or UPI when you meet.
        </p>
        {isUsingMockCatalog() ? (
          <p className="mt-3 rounded-lg bg-stone-200/70 px-3 py-2 text-xs text-stone-700">
            Running on local neighborhood data. Add Supabase keys later for live
            PostGIS search — the app does not need them to work.
          </p>
        ) : null}
      </section>
      <HomeDirectory shops={shops} services={services} />
    </div>
  );
}
