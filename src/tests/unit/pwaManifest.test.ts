import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";
import { metadata, viewport } from "@/app/layout";

describe("PWA install metadata", () => {
  it("defines an installable local-first app manifest", () => {
    expect(manifest()).toMatchObject({
      id: "/",
      name: "OpenPrep",
      short_name: "OpenPrep",
      description: "Open-source, accessible, local-first consulting interview preparation with offline support.",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#f2f2ee",
      theme_color: "#f2f2ee",
      categories: ["education", "productivity"],
      icons: [
        {
          src: "/icons/app-icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/app-icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/maskable-icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable"
        },
        {
          src: "/icons/app-icon.svg",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any"
        }
      ]
    });
  });

  it("exposes manifest, icons, and theme color from app metadata", () => {
    expect(metadata).toMatchObject({
      applicationName: "OpenPrep",
      description: "Open-source, accessible, local-first consulting interview preparation with offline support.",
      manifest: "/manifest.webmanifest",
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "OpenPrep"
      },
      formatDetection: {
        telephone: false
      },
      icons: {
        icon: [
          {
            rel: "icon",
            type: "image/svg+xml",
            url: "/icons/app-icon.svg"
          },
          {
            rel: "icon",
            sizes: "192x192",
            type: "image/png",
            url: "/icons/app-icon-192.png"
          },
          {
            rel: "icon",
            sizes: "512x512",
            type: "image/png",
            url: "/icons/app-icon-512.png"
          }
        ],
        apple: [
          {
            rel: "apple-touch-icon",
            sizes: "180x180",
            type: "image/png",
            url: "/icons/apple-touch-icon-180.png"
          }
        ]
      }
    });
    expect(viewport).toMatchObject({
      themeColor: [
        { color: "#f2f2ee", media: "(prefers-color-scheme: light)" },
        { color: "#20211f", media: "(prefers-color-scheme: dark)" }
      ]
    });
  });

  it("ships correctly sized PNG install artwork", () => {
    const iconDirectory = path.join(process.cwd(), "public", "icons");
    const expectedSizes = {
      "app-icon-192.png": 192,
      "app-icon-512.png": 512,
      "apple-touch-icon-180.png": 180,
      "maskable-icon-512.png": 512
    } as const;

    for (const [filename, size] of Object.entries(expectedSizes)) {
      const iconPath = path.join(iconDirectory, filename);
      expect(existsSync(iconPath), filename).toBe(true);
      expect(readPngDimensions(iconPath), filename).toEqual({ height: size, width: size });
    }
  });

  it("precaches every static app route", () => {
    const appDirectory = path.join(process.cwd(), "src", "app");
    const serviceWorker = readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");
    const precacheBlock = serviceWorker.match(/const PRECACHED_URLS = \[([\s\S]*?)\];/)?.[1];

    expect(precacheBlock).toBeDefined();

    const precachedUrls = new Set(precacheBlock?.match(/"[^"]+"/g)?.map((url) => JSON.parse(url)) ?? []);
    const staticRoutes = findPageFiles(appDirectory)
      .filter((file) => !file.includes("["))
      .map((file) => {
        const relativeDirectory = path.relative(appDirectory, path.dirname(file)).replaceAll(path.sep, "/");
        return relativeDirectory ? `/${relativeDirectory}/` : "/";
      });

    const missingRoutes = [...new Set(staticRoutes)].filter((route) => !precachedUrls.has(route)).sort();

    expect(missingRoutes).toEqual([]);
    expect(precachedUrls).toContain("/exhibits/sprint/");
  });

  it("keeps every authoring artifact out of core precache and available on demand", () => {
    const publicDirectory = path.join(process.cwd(), "public");
    const serviceWorker = readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");
    const recommendedFiles = [
      "math-drill-ai-pack-fixed-numeric-complete.md",
      "math-drill-ai-pack-generated-template-complete.md",
      "math-drill-ai-pack-exhibit-complete.md",
      "math-drill-ai-pack-market-sizing-complete.md",
      "math-drill-ai-pack-benchmark-complete.md",
      "math-drill-ai-pack-case-practice-complete.md"
    ];
    const recommendedBlock = serviceWorker.match(
      /const RECOMMENDED_AUTHORING_ARTIFACT_URLS = \[([\s\S]*?)\];/
    )?.[1];
    const precacheBlock = serviceWorker.match(/const PRECACHED_URLS = \[([\s\S]*?)\];/)?.[1];

    for (const filename of recommendedFiles) {
      expect(existsSync(path.join(publicDirectory, filename)), filename).toBe(true);
      expect(recommendedBlock, filename).toContain(`"/${filename}"`);
    }
    expect(precacheBlock).not.toContain("...RECOMMENDED_AUTHORING_ARTIFACT_URLS");
    expect(precacheBlock).not.toContain("...AUTHORING_ARTIFACT_URLS");
    expect(serviceWorker).toContain('"/math-drill-ai-pack-authoring-kit.md"');
    expect(serviceWorker).toContain("AUTHORING_ARTIFACT_URLS.includes(url.pathname)");
    expect(serviceWorker).toContain("event.respondWith(staleWhileRevalidate(event, request, normalizedCacheKey(request)))");
  });

  it("normalizes cache keys and caches static RSC payloads on demand", () => {
    const serviceWorker = readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");

    expect(serviceWorker).toContain('url.search = ""');
    expect(serviceWorker).toContain("isStaticRscPayload(request, url)");
    expect(serviceWorker).toContain('url.searchParams.has("_rsc")');
    expect(serviceWorker).toContain("event.waitUntil(fresh.then(() => undefined))");
    expect(serviceWorker).toContain("putIfCacheable(STATIC_CACHE, cacheKey, response.clone())");
    expect(serviceWorker).not.toContain("RUNTIME_CACHE");
    expect(serviceWorker).not.toContain("caches.match(");
  });

});

function findPageFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return findPageFiles(entryPath);
    }

    return entry.name === "page.tsx" ? [entryPath] : [];
  });
}

function readPngDimensions(filePath: string): { height: number; width: number } {
  const file = readFileSync(filePath);
  expect(file.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  return {
    height: file.readUInt32BE(20),
    width: file.readUInt32BE(16)
  };
}
