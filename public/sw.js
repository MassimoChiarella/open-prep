const CACHE_VERSION = "math-drill-offline-development";
const STATIC_CACHE = `${CACHE_VERSION}:static`;
const CACHE_READY_KEY = `/__${CACHE_VERSION}-ready`;
const NOT_FOUND_URL = "/404.html";

const RECOMMENDED_AUTHORING_ARTIFACT_URLS = [
  "/math-drill-ai-pack-fixed-numeric-complete.md",
  "/math-drill-ai-pack-generated-template-complete.md",
  "/math-drill-ai-pack-exhibit-complete.md",
  "/math-drill-ai-pack-market-sizing-complete.md",
  "/math-drill-ai-pack-benchmark-complete.md",
  "/math-drill-ai-pack-case-practice-complete.md"
];

const ADVANCED_AUTHORING_ARTIFACT_URLS = [
  "/math-drill-ai-pack-authoring-kit.md",
  "/math-drill-ai-pack-authoring-start.md",
  "/math-drill-ai-pack-fixed-numeric-kit.md",
  "/math-drill-ai-pack-generated-template-kit.md",
  "/math-drill-ai-pack-exhibit-kit.md",
  "/math-drill-ai-pack-market-sizing-kit.md",
  "/math-drill-ai-pack-benchmark-kit.md",
  "/math-drill-ai-pack-case-practice-kit.md",
  "/question-pack-author-guide.md",
  "/question-pack-example.mathdrill.json",
  "/question-pack-starter.mathdrill.json",
  "/question-pack-template-example.mathdrill.json",
  "/question-pack-interview-math-example.mathdrill.json",
  "/question-pack-exhibit-example.mathdrill.json",
  "/question-pack-chart-example.mathdrill.json",
  "/question-pack-visualization-cookbook.mathdrill.json",
  "/question-pack-market-sizing-example.mathdrill.json",
  "/question-pack-market-sizing-cookbook.mathdrill.json",
  "/question-pack-benchmark-example.mathdrill.json",
  "/question-pack-case-practice-example.mathdrill.json",
  "/question-pack-case-questioning-example.mathdrill.json",
  "/question-pack-v3-full-case-example.mathdrill.json",
  "/question-pack-v2.schema.json",
  "/question-pack-v3.schema.json"
];

const AUTHORING_ARTIFACT_URLS = [
  ...RECOMMENDED_AUTHORING_ARTIFACT_URLS,
  ...ADVANCED_AUTHORING_ARTIFACT_URLS
];
const COMMUNITY_PACK_CATALOG_URL = "/community-packs/catalog.v1.json";
const COMMUNITY_PACK_PREFIX = "/community-packs/";

const PRECACHED_URLS = [
  "/404.html",
  "/manifest.webmanifest",
  "/icons/app-icon.svg",
  "/icons/maskable-icon.svg",
  "/icons/app-icon-192.png",
  "/icons/app-icon-512.png",
  "/icons/maskable-icon-512.png",
  "/icons/apple-touch-icon-180.png",
  "/",
  "/drills/",
  "/drills/session/",
  "/drills/summary/",
  "/formulas/",
  "/progress/",
  "/benchmark/",
  "/benchmark/session/",
  "/market-sizing/",
  "/exhibits/",
  "/exhibits/sprint/",
  "/case-practice/",
  "/case-practice/brainstorming/",
  "/case-practice/fit/",
  "/case-practice/lessons/",
  "/case-practice/plan/",
  "/case-practice/questioning/",
  "/case-practice/simulation/",
  "/case-practice/structuring/",
  "/case-practice/synthesis/",
  "/content-packs/",
  "/content-packs/downloads/",
  "/privacy/",
  "/settings/"
];

const STATIC_PREFIXES = ["/_next/static/", "/icons/"];

self.addEventListener("install", (event) => {
  event.waitUntil(installStaticCache());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(activateStaticCache());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(staleWhileRevalidate(event, request, normalizedCacheKey(request, true)));
    return;
  }

  if (AUTHORING_ARTIFACT_URLS.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, request, normalizedCacheKey(request)));
    return;
  }

  if (url.pathname === COMMUNITY_PACK_CATALOG_URL || url.pathname.startsWith(COMMUNITY_PACK_PREFIX)) {
    event.respondWith(staleWhileRevalidate(event, request, normalizedCacheKey(request)));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, normalizedCacheKey(request)));
    return;
  }

  if (isStaticRscPayload(request, url)) {
    event.respondWith(staleWhileRevalidate(event, request, normalizedCacheKey(request)));
    return;
  }

  if (PRECACHED_URLS.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, request, normalizedCacheKey(request)));
  }
});

function isStaticAsset(pathname) {
  return STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || pathname === "/manifest.webmanifest";
}

function isStaticRscPayload(request, url) {
  return url.pathname.endsWith(".txt") && (
    request.headers.get("RSC") === "1" ||
    url.searchParams.has("_rsc") ||
    url.pathname.includes("/__next.") ||
    url.pathname.endsWith("/index.txt")
  );
}

function normalizedCacheKey(request, navigation = false) {
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";

  if (navigation) {
    if (url.pathname.endsWith("/index.html")) url.pathname = url.pathname.slice(0, -"index.html".length);
    else if (url.pathname === "/index.html") url.pathname = "/";
    else if (!url.pathname.endsWith("/") && !url.pathname.split("/").at(-1).includes(".")) url.pathname += "/";
  }

  return url.toString();
}

async function installStaticCache() {
  const existingCache = await caches.open(STATIC_CACHE);
  const existingReady = await existingCache.match(CACHE_READY_KEY);

  if (existingReady !== undefined && await existingReady.text() === CACHE_VERSION) {
    return;
  }

  await caches.delete(STATIC_CACHE);
  const cache = await caches.open(STATIC_CACHE);

  try {
    await cache.addAll(PRECACHED_URLS);
    await cache.put(
      CACHE_READY_KEY,
      new Response(CACHE_VERSION, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
    );
  } catch (error) {
    await caches.delete(STATIC_CACHE);
    throw error;
  }
}

async function activateStaticCache() {
  const cache = await caches.open(STATIC_CACHE);
  const ready = await cache.match(CACHE_READY_KEY);

  if (ready === undefined || await ready.text() !== CACHE_VERSION) {
    throw new Error("The new offline cache is incomplete.");
  }

  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith("math-drill-offline-") && key !== STATIC_CACHE)
      .map((key) => caches.delete(key))
  );
}

async function cacheFirst(request, cacheKey) {
  const cached = await matchFromCurrentCache(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  const response = await fetch(request);
  await putIfCacheable(STATIC_CACHE, cacheKey, response.clone());
  return response;
}

function staleWhileRevalidate(event, request, cacheKey) {
  const fresh = fetch(request)
    .then(async (response) => {
      if (isCacheable(response)) {
        await putIfCacheable(STATIC_CACHE, cacheKey, response.clone());
      }

      return response;
    })
    .catch(() => undefined);
  event.waitUntil(fresh.then(() => undefined));

  return matchFromCurrentCache(cacheKey).then(async (cached) => cached ?? await fresh ?? offlineFallback(request));
}

async function offlineFallback(request) {
  if (request.mode === "navigate") {
    const notFound = await matchFromCurrentCache(NOT_FOUND_URL);
    if (notFound !== undefined) {
      return new Response(await notFound.clone().arrayBuffer(), {
        headers: notFound.headers,
        status: 404,
        statusText: "Not Found"
      });
    }
  }

  return new Response("This resource is not available offline yet.", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    status: 503,
    statusText: "Unavailable Offline"
  });
}

async function matchFromCurrentCache(cacheKey) {
  const cache = await caches.open(STATIC_CACHE);
  return cache.match(cacheKey);
}

async function putIfCacheable(cacheName, cacheKey, response) {
  if (isCacheable(response)) {
    const cache = await caches.open(cacheName);
    await cache.put(cacheKey, response);
  }
}

function isCacheable(response) {
  return response.ok && response.type !== "opaque";
}
