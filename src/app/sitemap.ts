import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "/",
    "/drills/",
    "/formulas/",
    "/benchmark/",
    "/market-sizing/",
    "/exhibits/",
    "/case-practice/",
    "/case-practice/lessons/",
    "/content-packs/",
    "/content-packs/downloads/",
    "/privacy/"
  ].map((pathname) => ({ url: `https://openprep.app${pathname}` }));
}
