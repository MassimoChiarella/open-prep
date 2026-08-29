import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";
import { metadata, viewport } from "@/app/layout";

describe("PWA install metadata", () => {
  it("defines an installable local-first app manifest", () => {
    expect(manifest()).toMatchObject({
      id: "/",
      name: "Consulting Mental Math Practice",
      short_name: "Mental Math",
      description: "Private, local-first consulting mental math practice in your browser.",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait-primary",
      background_color: "#f2f2ee",
      theme_color: "#20211f",
      categories: ["education", "productivity"],
      icons: [
        {
          src: "/icons/app-icon.svg",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any"
        },
        {
          src: "/icons/maskable-icon.svg",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "maskable"
        }
      ]
    });
  });

  it("exposes manifest, icons, and theme color from app metadata", () => {
    expect(metadata).toMatchObject({
      applicationName: "Consulting Mental Math Practice",
      description: "A private, local-first consulting mental math practice web app.",
      manifest: "/manifest.webmanifest",
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Mental Math Practice"
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
          }
        ],
        apple: [
          {
            rel: "apple-touch-icon",
            url: "/icons/maskable-icon.svg"
          }
        ]
      }
    });
    expect(viewport).toMatchObject({
      themeColor: "#20211f"
    });
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

  it("ships, precaches, and refreshes AI authoring artifacts network-first", () => {
    const publicDirectory = path.join(process.cwd(), "public");
    const serviceWorker = readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");
    const authoringFiles = [
      "math-drill-ai-pack-authoring-kit.md",
      "math-drill-ai-pack-authoring-start.md",
      "math-drill-ai-pack-fixed-numeric-kit.md",
      "math-drill-ai-pack-generated-template-kit.md",
      "math-drill-ai-pack-exhibit-kit.md",
      "math-drill-ai-pack-market-sizing-kit.md",
      "math-drill-ai-pack-benchmark-kit.md",
      "math-drill-ai-pack-case-practice-kit.md"
    ];

    for (const filename of authoringFiles) {
      expect(existsSync(path.join(publicDirectory, filename)), filename).toBe(true);
      expect(serviceWorker, filename).toContain(`"/${filename}"`);
    }
    expect(serviceWorker).toContain("AUTHORING_ARTIFACT_URLS.includes(url.pathname)");
    expect(serviceWorker).toContain("event.respondWith(networkFirst(request))");
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
