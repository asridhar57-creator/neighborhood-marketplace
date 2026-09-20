import { cookies } from "next/headers";

import { HomeDirectory } from "@/components/home-directory";
import { HomeHero } from "@/components/home-hero";
import { searchNeighborhood } from "@/lib/catalog";
import { DEFAULT_NEIGHBORHOOD } from "@/lib/mock-data";
import { isUsingMockCatalog } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

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
      <HomeHero mockBanner={isUsingMockCatalog()} />
      <HomeDirectory shops={shops} services={services} />
    </div>
  );
}
