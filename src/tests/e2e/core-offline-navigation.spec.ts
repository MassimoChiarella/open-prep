import { expect, test, type Page } from "@playwright/test";

const catalogUrl = "/community-packs/catalog.v1.json";
const authoringArtifactUrl = "/math-drill-ai-pack-fixed-numeric-complete.md";
const unvisitedCoreRoute = "/drills/";

test(
  "a verified PWA install keeps an unvisited core route available offline",
  { tag: "@browser-smoke" },
  async ({ browserName, page, request }) => {
    const markerResponse = await request.get("/open-prep-release.json");
    expect(markerResponse.status(), "Run npm run build to provide a verified release marker.").toBe(200);
    expect(await markerResponse.json()).toMatchObject({
      product: "Open Prep",
      schemaVersion: 1,
      artifact: { cacheId: expect.stringMatching(/^math-drill-offline-v/) }
    });

    await page.goto("/");
    await expect.poll(
      () => page.evaluate(async () => (await navigator.serviceWorker.getRegistration("/")) !== undefined),
      { timeout: 10_000 }
    ).toBe(true);
    await page.evaluate(async () => navigator.serviceWorker.ready.then(() => undefined));
    await page.reload();
    await expect.poll(
      () => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL.endsWith("/sw.js") === true)
    ).toBe(true);

    const installedPaths = await readOfflineCachePaths(page);
    expect(installedPaths).toContain(unvisitedCoreRoute);
    expect(installedPaths).not.toContain(catalogUrl);
    expect(installedPaths).not.toContain(authoringArtifactUrl);
    expect(installedPaths.some(isIndividualCommunityPack)).toBe(false);

    const catalogStatus = await page.evaluate(async (url) => (await window.fetch(url)).status, catalogUrl);
    expect(catalogStatus).toBe(200);
    const warmedPaths = await readOfflineCachePaths(page);
    expect(warmedPaths).toContain(catalogUrl);
    expect(warmedPaths).not.toContain(authoringArtifactUrl);
    expect(warmedPaths.some(isIndividualCommunityPack)).toBe(false);

    await page.context().setOffline(true);
    try {
      if (browserName === "webkit") {
        const route = await page.evaluate(async (pathname) => {
          const cacheNames = (await caches.keys()).filter(
            (name) => name.startsWith("math-drill-offline-") && name.endsWith(":static")
          );
          const response = cacheNames.length === 1
            ? await (await caches.open(cacheNames[0])).match(pathname)
            : undefined;
          if (response === undefined) throw new Error(`Missing offline response for ${pathname}.`);
          return { body: await response.text(), status: response.status };
        }, unvisitedCoreRoute);
        expect(route.status).toBe(200);
        expect(route.body).toContain("Drill Selection");
        expect(route.body).toContain("Start Drill");
      } else {
        const response = await page.goto(unvisitedCoreRoute, { waitUntil: "domcontentloaded" });
        expect(response?.status()).toBe(200);
        await expect(page.getByRole("heading", { level: 1, name: "Drill Selection" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Start Drill" })).toBeVisible();
      }
    } finally {
      await page.context().setOffline(false);
    }
  }
);

async function readOfflineCachePaths(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const names = (await caches.keys()).filter(
      (name) => name.startsWith("math-drill-offline-") && name.endsWith(":static")
    );
    if (names.length !== 1) throw new Error(`Expected one current offline cache, found ${names.length}.`);
    const cache = await caches.open(names[0]);
    return (await cache.keys()).map((request) => new URL(request.url).pathname).sort();
  });
}

function isIndividualCommunityPack(pathname: string): boolean {
  return pathname.startsWith("/community-packs/") && pathname !== catalogUrl;
}
