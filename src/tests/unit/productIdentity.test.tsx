import { readFileSync } from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";
import { resolveAlternates, resolveRobots } from "next/dist/lib/metadata/resolvers/resolve-basics";
import { resolveOpenGraph } from "next/dist/lib/metadata/resolvers/resolve-opengraph";
import { describe, expect, it, vi } from "vitest";

import { metadata as sessionMetadata } from "@/app/drills/session/layout";
import { metadata } from "@/app/layout";
import { metadata as progressMetadata } from "@/app/progress/page";
import robots, { dynamic as robotsRendering } from "@/app/robots";
import sitemap, { dynamic as sitemapRendering } from "@/app/sitemap";
import { LocalizedAppShell, returnToNeutralRoute } from "@/components/LocalizedAppShell";
import { coreMessages } from "@/features/i18n/messages/core";

vi.mock("@/components/AppNav", () => ({
  AppNav: () => <nav aria-label="Test navigation" />
}));
vi.mock("@/features/offline/OfflineStatusIndicator", () => ({
  OfflineStatusIndicator: () => null
}));

describe("OpenPrep product identity", () => {
  it("uses the product name and comprehensive descriptor in app metadata", () => {
    expect(metadata).toMatchObject({
      applicationName: "OpenPrep",
      description: "Open-source, accessible, local-first consulting interview preparation with offline support.",
      title: {
        default: "OpenPrep",
        template: "%s | OpenPrep"
      }
    });
  });

  it("resolves canonical and sharing URLs against each page instead of the homepage", async () => {
    const context = { trailingSlash: true, isStaticMetadataRouteFile: false };
    const metadataBase = metadata.metadataBase ? new URL(metadata.metadataBase) : null;
    for (const pathname of ["/", "/drills/", "/case-practice/lessons/", "/content-packs/downloads/", "/progress/"]) {
      const alternates = await resolveAlternates(
        metadata.alternates, metadataBase, Promise.resolve(pathname), context
      );
      const openGraph = await resolveOpenGraph(
        metadata.openGraph, metadataBase, Promise.resolve(pathname), context, null
      );
      expect(alternates?.canonical?.url, pathname).toBe(`https://openprep.app${pathname}`);
      expect(openGraph?.url, pathname).toBe(`https://openprep.app${pathname}`);
      const image = openGraph?.images?.[0];
      const imageUrl = typeof image === "string" || image instanceof URL ? image : image?.url;
      expect(String(imageUrl)).toBe("https://openprep.app/social/openprep-card.png");
    }
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("keeps public entry pages discoverable and private workspaces and sessions out of search", () => {
    const urls = sitemap().map(({ url }) => url);
    expect(sitemapRendering).toBe("force-static");
    expect(robotsRendering).toBe("force-static");
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://openprep.app/sitemap.xml"
    });
    expect(urls).toEqual(expect.arrayContaining([
      "https://openprep.app/",
      "https://openprep.app/drills/",
      "https://openprep.app/case-practice/lessons/",
      "https://openprep.app/privacy/"
    ]));
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url).toMatch(/^https:\/\/openprep\.app\/(?:[a-z-]+\/)*$/u);
      expect(url).not.toMatch(/\/(?:progress|settings|session|summary|sprint|fit|plan|brainstorming|questioning|structuring|synthesis|simulation)\//u);
    }
    for (const value of [progressMetadata, sessionMetadata]) {
      expect(resolveRobots(value.robots)?.basic).toBe("noindex, follow");
    }
  });

  it("renders the untranslated product name with a translated descriptor", () => {
    render(<LocalizedAppShell><main>Practice</main></LocalizedAppShell>);

    expect(screen.getByText("OpenPrep")).toBeInTheDocument();
    expect(screen.queryByText("Open Prep")).not.toBeInTheDocument();
    expect(screen.getByText("Consulting interview preparation")).toBeInTheDocument();
  });

  it("returns every invalidated tab to the neutral route", () => {
    const replace = vi.fn();

    returnToNeutralRoute({ replace });

    expect(replace).toHaveBeenCalledWith("/");
  });

  it("keeps the proper name out of locale catalogs while translating the descriptor", () => {
    for (const [locale, messages] of Object.entries(coreMessages)) {
      expect(messages).not.toHaveProperty("OpenPrep");
      expect(messages["Consulting interview preparation"]).toBeTruthy();
      if (locale !== "en") {
        expect(messages["Consulting interview preparation"]).not.toBe("Consulting interview preparation");
      }
    }
  });

  it("ships original, non-calculator-only source artwork", () => {
    for (const filename of ["app-icon.svg", "maskable-icon.svg"]) {
      const source = readFileSync(path.join(process.cwd(), "public", "icons", filename), "utf8");
      expect(source).toContain("OpenPrep");
      expect(source).not.toMatch(/calculator|mental math/i);
    }
  });
});
