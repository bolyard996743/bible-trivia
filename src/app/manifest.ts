import type { MetadataRoute } from "next";
import { THEMES } from "@/lib/theme";

const brand = THEMES.default;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Noble Bereans",
    short_name: "Noble Bereans",
    description: "Noble Bereans teaches from Scripture and waits until you know the answer.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: brand.parchment,
    theme_color: brand.grove,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
