import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { appDatabaseName } from "../../lib/storage/appStorageTypes";

// Two distinct asset URL generations exercise a real worker update without rebuilding inside Playwright.
for (const failInstall of [false, true]) {
  test(failInstall
    ? "a failed dependency install preserves the previous offline app and its saved answers"
    : "an installed update hydrates and saves answers on the first offline reopen", async ({ browser }) => {
    const fixture = await serveGenerations(failInstall);
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(`${fixture.origin}/drills/`);
      await page.evaluate(async () => navigator.serviceWorker.ready.then(() => undefined));
      await page.reload();
      await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
      await expect(page.getByRole("link", { name: "Start Drill", exact: true })).toBeVisible();
      expect(await page.evaluate(() => caches.keys())).toContain("math-drill-offline-upgrade-v1:static");

      fixture.upgrade();
      const nextWorkerPromise = context.waitForEvent("serviceworker");
      await page.evaluate(async () => (await navigator.serviceWorker.getRegistration("/"))!.update());
      const nextWorker = await nextWorkerPromise;

      if (failInstall) {
        await expect.poll(() => fixture.failedDependencies()).toBeGreaterThan(0);
        await expect.poll(() => page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration("/");
          return registration?.installing === null && registration.waiting === null;
        })).toBe(true);
        expect(await page.evaluate(() => caches.keys())).toEqual(["math-drill-offline-upgrade-v1:static"]);
        // A reload while the server offers v2 must not overwrite the complete v1 shell with v2 URLs.
        const reload = await page.reload();
        expect(await reload!.text()).not.toContain("/_next/upgrade-v2/");
        await expect(page.getByRole("link", { name: "Start Drill", exact: true })).toBeVisible();
      } else {
        await expect.poll(() => page.evaluate(async () =>
          (await navigator.serviceWorker.getRegistration("/"))?.waiting?.state
        )).toBe("installed");
        expect(await page.evaluate(() => caches.keys())).toContain("math-drill-offline-upgrade-v1:static");
        const missingDependencies = await page.evaluate(async () => {
          const cache = await caches.open("math-drill-offline-upgrade-v2:static");
          const worker = await window.fetch("/sw.js").then((response) => response.text());
          const urls = JSON.parse(worker.match(/const PRECACHED_URLS = (\[[\s\S]*?\]);/)![1]) as string[];
          return (await Promise.all(urls.map(async (url) => await cache.match(url) === undefined ? url : undefined)))
            .filter((url) => url !== undefined);
        });
        expect(missingDependencies).toEqual([]);
      }

      await context.setOffline(true);
      await page.close();
      if (!failInstall) {
        await expect.poll(() => nextWorker.evaluate(() =>
          (self as unknown as { registration: ServiceWorkerRegistration }).registration.active?.state
        ).catch(() => undefined)).toBe("activated");
      }

      const reopened = await context.newPage();
      const errors: string[] = [];
      reopened.on("pageerror", (error) => errors.push(error.message));
      const response = await reopened.goto(`${fixture.origin}/drills/session/?categories=arithmetic&tags=addition&count=1&feedbackMode=instant`);
      expect(response?.status()).toBe(200);
      await expect(reopened.getByLabel("Answer", { exact: true })).toBeVisible();
      await expect(reopened.getByTestId("offline-status-indicator")).toContainText("Offline ready");
      const prompt = await reopened.getByTestId("active-question-prompt").innerText();
      const terms = prompt.match(/^What is (\d+) \+ (\d+)\?$/);
      expect(terms).not.toBeNull();
      await reopened.getByLabel("Answer", { exact: true }).fill(String(Number(terms![1]) + Number(terms![2])));
      await reopened.getByRole("button", { name: "Submit", exact: true }).click();
      await reopened.getByRole("button", { name: "View summary" }).click();
      await expect(reopened.getByText("Session saved on this device.", { exact: true })).toBeVisible();
      expect(await responseCount(reopened)).toBe(1);
      await reopened.reload();
      expect(await responseCount(reopened)).toBe(1);
      expect(errors).toEqual([]);
      expect(await reopened.evaluate(() => caches.keys())).toEqual([
        `math-drill-offline-upgrade-v${failInstall ? 1 : 2}:static`
      ]);
    } finally {
      await context.close();
      await fixture.close();
    }
  });
}

async function serveGenerations(failInstall: boolean) {
  const root = path.resolve(process.env.OPEN_PREP_UPGRADE_OUTPUT ?? "out");
  let generation = 1;
  let failures = 0;
  const worker = await readFile(path.join(root, "sw.js"), "utf8");
  const failedAsset = worker.match(/"(\/_next\/static\/[^"\n]+\.js)"/)?.[1];
  if (failedAsset === undefined) throw new Error("Build the complete service-worker dependency inventory before this test.");
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url!, "http://localhost").pathname)
        .replace("/_next/upgrade-v2/", "/_next/");
      if (failInstall && generation === 2 && pathname === failedAsset) {
        failures += 1;
        response.writeHead(503).end("Simulated missing release dependency");
        return;
      }
      let file = path.resolve(root, `.${pathname}`);
      if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error("Invalid fixture path");
      if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
      let contents = await readFile(file);
      const extension = path.extname(file);
      if ([".html", ".js", ".css", ".txt"].includes(extension)) {
        let text = contents.toString();
        if (pathname === "/sw.js") text = text.replace(/^const CACHE_VERSION = "[^"]+";/m,
          `const CACHE_VERSION = "math-drill-offline-upgrade-v${generation}";`);
        if (generation === 2) text = text.replaceAll("/_next/", "/_next/upgrade-v2/");
        contents = Buffer.from(text);
      }
      const types: Record<string, string> = {
        ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".txt": "text/plain",
        ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png"
      };
      response.writeHead(200, { "Content-Type": types[extension] ?? "application/octet-stream", "Cache-Control": "no-store" });
      response.end(contents);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Missing fixture server port");
  return {
    origin: `http://127.0.0.1:${address.port}`,
    upgrade: () => { generation = 2; },
    failedDependencies: () => failures,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}

async function responseCount(page: Page): Promise<number> {
  return page.evaluate((databaseName) => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const count = database.transaction("responses", "readonly").objectStore("responses").count();
      count.onsuccess = () => { database.close(); resolve(count.result); };
      count.onerror = () => { database.close(); reject(count.error); };
    };
  }), appDatabaseName);
}
