import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    // Keep assets and noindex pages crawlable so search engines can render and read their metadata.
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://openprep.app/sitemap.xml"
  };
}
