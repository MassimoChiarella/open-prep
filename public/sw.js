const CACHE_VERSION = "math-drill-offline-v23";
const STATIC_CACHE = `${CACHE_VERSION}:static`;
const RUNTIME_CACHE = `${CACHE_VERSION}:runtime`;

const AUTHORING_ARTIFACT_URLS = [
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

const PRECACHED_URLS = [
  "/manifest.webmanifest",
  "/icons/app-icon.svg",
  "/icons/maskable-icon.svg",
  ...AUTHORING_ARTIFACT_URLS,
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
  "/content-packs/downloads/",
  "/settings/"
];

const STATIC_PREFIXES = ["/_next/static/", "/icons/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => Promise.all(PRECACHED_URLS.map((url) => addToCacheIfAvailable(cache, url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("math-drill-offline-") && !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
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
    event.respondWith(networkFirst(request));
    return;
  }

  if (AUTHORING_ARTIFACT_URLS.includes(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (PRECACHED_URLS.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

function isStaticAsset(pathname) {
  return STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || pathname === "/manifest.webmanifest";
}

async function addToCacheIfAvailable(cache, url) {
  try {
    const response = await fetch(url);

    if (isCacheable(response)) {
      await cache.put(url, response);
    }
  } catch {
    return undefined;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached !== undefined) {
    return cached;
  }

  const response = await fetch(request);
  await putIfCacheable(STATIC_CACHE, request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    await putIfCacheable(RUNTIME_CACHE, request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request, {
      ignoreSearch: true
    });

    return cached ?? caches.match("/");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request, {
    ignoreSearch: true
  });
  const fresh = fetch(request)
    .then((response) => {
      if (isCacheable(response)) {
        void cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => undefined);

  return cached ?? fresh ?? caches.match("/");
}

async function putIfCacheable(cacheName, request, response) {
  if (isCacheable(response)) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  }
}

function isCacheable(response) {
  return response.ok && response.type !== "opaque";
}
