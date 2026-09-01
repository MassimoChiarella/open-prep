import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

const appOrigin = "https://practice.test";
const workerSource = readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");
const cacheVersion = workerSource.match(/^const CACHE_VERSION = "([^"]+)";$/m)?.[1];

if (cacheVersion === undefined) throw new Error("Could not read CACHE_VERSION from public/sw.js.");

const currentCacheName = `${cacheVersion}:static`;
const currentReadyKey = `/__${cacheVersion}-ready`;
const previousCacheName = "math-drill-offline-previous:static";

describe("service worker cache lifecycle", () => {
  it("keeps the last complete cache when a new precache fails", async () => {
    const harness = createHarness({ failNewCacheAddAll: true });
    await harness.put(previousCacheName, "/", new Response("last known good"));

    await expect(harness.dispatchLifetimeEvent("install")).rejects.toThrow("precache failed");

    expect(await harness.cacheNames()).toContain(previousCacheName);
    expect(await harness.cacheNames()).not.toContain(currentCacheName);
  });

  it("keeps a ready same-generation cache instead of replacing it in place", async () => {
    const harness = createHarness({ failNewCacheAddAll: true });
    await harness.put(currentCacheName, "/", new Response("ready shell"));
    await harness.put(currentCacheName, currentReadyKey, new Response(cacheVersion));

    await expect(harness.dispatchLifetimeEvent("install")).resolves.toBeUndefined();

    expect(await (await harness.match(currentCacheName, "/"))?.text()).toBe("ready shell");
  });

  it("does not remove an old cache when the new generation is incomplete", async () => {
    const harness = createHarness();
    await harness.put(previousCacheName, "/", new Response("last known good"));

    await expect(harness.dispatchLifetimeEvent("activate")).rejects.toThrow(
      "The new offline cache is incomplete."
    );

    expect(await harness.cacheNames()).toContain(previousCacheName);
  });

  it("activates a complete generation before deleting older cache generations", async () => {
    const harness = createHarness();
    await harness.put(previousCacheName, "/", new Response("old"));

    await harness.dispatchLifetimeEvent("install");
    await harness.dispatchLifetimeEvent("activate");

    expect(await harness.cacheNames()).toEqual([currentCacheName]);
    expect(await harness.match(currentCacheName, "/")).toBeDefined();
  });

  it("leaves unrelated caches untouched during activation", async () => {
    const harness = createHarness();
    await harness.put("unrelated-static-cache", "/asset", new Response("unrelated"));

    await harness.dispatchLifetimeEvent("install");
    await harness.dispatchLifetimeEvent("activate");

    expect(await harness.cacheNames()).toEqual(["unrelated-static-cache", currentCacheName]);
  });

  it("serves the branded 404 document for an uncached offline navigation", async () => {
    const harness = createHarness({ fetch: vi.fn().mockRejectedValue(new TypeError("offline")) });
    await harness.dispatchLifetimeEvent("install");

    const response = await harness.dispatchFetch("/missing-interview-route");

    expect(response.status).toBe(404);
    expect(await response.text()).toContain("Offline page not found");
  });

  it("serves the current cache generation when an older cache has the same route", async () => {
    const harness = createHarness({ fetch: vi.fn().mockRejectedValue(new TypeError("offline")) });
    await harness.put(previousCacheName, "/", new Response("stale shell"));
    await harness.put(currentCacheName, "/", new Response("current shell"));

    const response = await harness.dispatchFetch("/");

    expect(await response.text()).toBe("current shell");
  });

  it("keeps a cached navigation usable when background revalidation is interrupted", async () => {
    let rejectFetch: ((reason: unknown) => void) | undefined;
    const fetchMock = vi.fn(() => new Promise<Response>((_resolve, reject) => {
      rejectFetch = reject;
    }));
    const harness = createHarness({ fetch: fetchMock });
    await harness.dispatchLifetimeEvent("install");

    const responsePromise = harness.dispatchFetch("/");
    await Promise.resolve();
    rejectFetch?.(new TypeError("connection interrupted"));

    const response = await responsePromise;
    expect(await response.text()).toBe("cached /");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("finishes a successful background cache write inside the fetch lifetime", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("updated shell"));
    const harness = createHarness({ fetch: fetchMock });
    await harness.put(currentCacheName, "/", new Response("current shell"));

    const response = await harness.dispatchFetch("/");
    const refreshed = await harness.match(currentCacheName, "/");

    expect(await response.text()).toBe("current shell");
    expect(await refreshed?.text()).toBe("updated shell");
  });

  it("runtime-caches community catalog and pack files without precaching them", async () => {
    let offline = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (offline) throw new TypeError("offline");
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, appOrigin);
      return new Response(`fetched ${url.pathname}`, { headers: { "Content-Type": "application/json" } });
    });
    const harness = createHarness({ fetch: fetchMock });
    await harness.dispatchLifetimeEvent("install");

    expect(await harness.match(currentCacheName, "/community-packs/catalog.v1.json")).toBeUndefined();
    expect(await harness.match(currentCacheName, "/community-packs/example/1.0.0/pack.mathdrill.json")).toBeUndefined();

    const catalog = await harness.dispatchFetch("/community-packs/catalog.v1.json", "cors");
    const pack = await harness.dispatchFetch("/community-packs/example/1.0.0/pack.mathdrill.json", "cors");
    expect(await catalog.text()).toContain("catalog.v1.json");
    expect(await pack.text()).toContain("pack.mathdrill.json");

    offline = true;
    const cachedPack = await harness.dispatchFetch("/community-packs/example/1.0.0/pack.mathdrill.json", "cors");
    expect(await cachedPack.text()).toContain("pack.mathdrill.json");

    const unseenPack = await harness.dispatchFetch("/community-packs/unseen/1.0.0/pack.mathdrill.json", "cors");
    expect(unseenPack.status).toBe(503);
    expect(await unseenPack.text()).toBe("This resource is not available offline yet.");
  });

  it("caches authoring downloads only after use and canonicalizes revision queries", async () => {
    let offline = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (offline) throw new TypeError("offline");
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, appOrigin);
      return new Response(`downloaded ${url.pathname}`);
    });
    const harness = createHarness({ fetch: fetchMock });
    await harness.dispatchLifetimeEvent("install");

    const recommended = "/math-drill-ai-pack-fixed-numeric-complete.md";
    const advanced = "/math-drill-ai-pack-authoring-kit.md";
    expect(await harness.match(currentCacheName, recommended)).toBeUndefined();
    expect(await harness.match(currentCacheName, advanced)).toBeUndefined();

    await harness.dispatchFetch(`${recommended}?revision=2026-08-29`, "cors");
    await harness.dispatchFetch(`${advanced}?revision=2026-08-29`, "cors");
    expect(await (await harness.match(currentCacheName, recommended))?.text()).toContain(recommended);
    expect(await (await harness.match(currentCacheName, advanced))?.text()).toContain(advanced);

    offline = true;
    expect(await (await harness.dispatchFetch(`${recommended}?revision=older`, "cors")).text()).toContain(recommended);
    const unseen = await harness.dispatchFetch("/question-pack-v3.schema.json", "cors");
    expect(unseen.status).toBe(503);
  });

  it("does not cache failed authoring responses", async () => {
    const path = "/question-pack-author-guide.md";
    const harness = createHarness({
      fetch: vi.fn().mockResolvedValue(new Response("failure", { status: 500 }))
    });
    await harness.dispatchLifetimeEvent("install");

    expect((await harness.dispatchFetch(path, "cors")).status).toBe(500);
    expect(await harness.match(currentCacheName, path)).toBeUndefined();
  });
});

interface HarnessOptions {
  failNewCacheAddAll?: boolean;
  fetch?: typeof fetch;
}

function createHarness(options: HarnessOptions = {}) {
  const listeners = new Map<string, (event: MockEvent) => void>();
  const cacheStorage = new MockCacheStorage(options.failNewCacheAddAll === true);
  const fetchMock = options.fetch ?? vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, appOrigin);
    return new Response(
      url.pathname === "/404.html" ? "<!doctype html><title>Offline page not found</title>" : `cached ${url.pathname}`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  });
  const context = vm.createContext({
    caches: cacheStorage,
    console,
    Error,
    fetch: fetchMock,
    Headers,
    Promise,
    Response,
    self: {
      addEventListener(type: string, listener: (event: MockEvent) => void) {
        listeners.set(type, listener);
      },
      location: { origin: appOrigin }
    },
    TypeError,
    URL
  });
  vm.runInContext(workerSource, context, { filename: "public/sw.js" });

  return {
    cacheNames: () => cacheStorage.keys(),
    dispatchFetch: async (pathname: string, mode: RequestMode = "navigate") => {
      let responsePromise: Promise<Response> | undefined;
      const lifetimePromises: Promise<unknown>[] = [];
      const event: MockEvent = {
        request: {
          headers: new Headers(),
          method: "GET",
          mode,
          url: `${appOrigin}${pathname}`
        },
        respondWith(value) {
          responsePromise = Promise.resolve(value);
        },
        waitUntil(value) {
          lifetimePromises.push(Promise.resolve(value));
        }
      };
      listeners.get("fetch")?.(event);
      if (responsePromise === undefined) throw new Error("The fetch event was not handled.");
      const response = await responsePromise;
      await Promise.all(lifetimePromises);
      return response;
    },
    dispatchLifetimeEvent: async (type: "activate" | "install") => {
      const lifetimePromises: Promise<unknown>[] = [];
      listeners.get(type)?.({
        waitUntil(value) {
          lifetimePromises.push(Promise.resolve(value));
        }
      });
      if (lifetimePromises.length === 0) throw new Error(`${type} did not register lifetime work.`);
      await Promise.all(lifetimePromises);
    },
    match: (cacheName: string, key: string) => cacheStorage.open(cacheName).then((cache) => cache.match(key)),
    put: (cacheName: string, key: string, response: Response) =>
      cacheStorage.open(cacheName).then((cache) => cache.put(key, response))
  };
}

interface MockEvent {
  request?: {
    headers: Headers;
    method: string;
    mode: string;
    url: string;
  };
  respondWith?(value: Promise<Response> | Response): void;
  waitUntil(value: Promise<unknown>): void;
}

class MockCacheStorage {
  private readonly cachesByName = new Map<string, MockCache>();

  constructor(private readonly failNewCacheAddAll: boolean) {}

  async delete(name: string): Promise<boolean> {
    return this.cachesByName.delete(name);
  }

  async keys(): Promise<string[]> {
    return [...this.cachesByName.keys()];
  }

  async open(name: string): Promise<MockCache> {
    const existing = this.cachesByName.get(name);
    if (existing !== undefined) return existing;

    const cache = new MockCache(name === currentCacheName && this.failNewCacheAddAll);
    this.cachesByName.set(name, cache);
    return cache;
  }
}

class MockCache {
  private readonly responses = new Map<string, Response>();

  constructor(private readonly failAddAll: boolean) {}

  async addAll(urls: readonly string[]): Promise<void> {
    if (this.failAddAll) {
      await this.put(urls[0], new Response("partial"));
      throw new Error("precache failed");
    }

    for (const url of urls) {
      const body = url === "/404.html"
        ? "<!doctype html><title>Offline page not found</title>"
        : `cached ${url}`;
      await this.put(url, new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8" } }));
    }
  }

  async match(key: RequestInfo | URL): Promise<Response | undefined> {
    return this.responses.get(normalizeCacheKey(key))?.clone();
  }

  async put(key: RequestInfo | URL, response: Response): Promise<void> {
    this.responses.set(normalizeCacheKey(key), response.clone());
  }
}

function normalizeCacheKey(input: RequestInfo | URL): string {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  return new URL(raw, appOrigin).href;
}
