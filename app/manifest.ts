import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Neighborhood Marketplace",
    short_name: "Nhood Market",
    description:
      "Shops and service people on your street. Pay cash or UPI at the counter or doorstep.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#44403c",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
