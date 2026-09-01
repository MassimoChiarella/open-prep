import { fileURLToPath } from "node:url";
import path from "node:path";

import { createSecurityHeaders } from "./security-headers.mjs";

const PRODUCT_NAME = "Open Prep";
const RELEASE_MARKER_PATH = "/open-prep-release.json";
const MANIFEST_PATH = "/manifest.webmanifest";
const SERVICE_WORKER_PATH = "/sw.js";
const REQUEST_TIMEOUT_MS = 15_000;
const CORE_ROUTES = [
  "/",
  "/drills/",
  "/formulas/",
  "/progress/",
  "/benchmark/",
  "/market-sizing/",
  "/exhibits/",
  "/case-practice/",
  "/content-packs/",
  "/settings/"
];
const NOT_FOUND_PATH = "/__open-prep-post-deployment-smoke-not-found__";
const SYNTHETIC_STORAGE_KEY = "open_prep_post_deployment_smoke";
const SYNTHETIC_STORAGE_VALUE = "synthetic-local-save-v1";
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SCRIPT_HASH_PATTERN = /^'sha256-[A-Za-z0-9+/]{43}='$/u;
const REFERENCE_SCRIPT_HASH = `${"A".repeat(43)}=`;

export function validateDeploymentOrigin(value) {
  if (typeof value !== "string" || value === "" || value.trim() !== value) {
    throw new Error("Provide one HTTPS origin without surrounding whitespace.");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Deployment origin must be a valid absolute HTTPS URL.");
  }

  if (url.protocol !== "https:") throw new Error("Deployment origin must use HTTPS.");
  if (url.username !== "" || url.password !== "") {
    throw new Error("Deployment origin must not contain credentials.");
  }
  if (value.includes("?") || value.includes("#") || url.search !== "" || url.hash !== "") {
    throw new Error("Deployment origin must not contain a query or fragment.");
  }
  if (url.pathname !== "/") {
    throw new Error("Open Prep must be deployed at the origin root; remove the path from the origin.");
  }

  return url.origin;
}

export function validateReleaseMarker(value) {
  const marker = requireRecord(value, "Release marker");
  const source = requireRecord(marker.source, "Release marker source");
  const artifact = requireRecord(marker.artifact, "Release marker artifact");

  if (marker.schemaVersion !== 1 || marker.product !== PRODUCT_NAME) {
    throw new Error("Release marker schema or product is not supported.");
  }
  if (typeof marker.version !== "string" || !SEMVER_PATTERN.test(marker.version)) {
    throw new Error("Release marker version must be valid SemVer.");
  }
  if (typeof source.commit !== "string" || !COMMIT_PATTERN.test(source.commit)) {
    throw new Error("Release marker source commit must be a full lowercase revision.");
  }
  if (source.clean !== true) {
    throw new Error("The deployed release marker must describe a clean source revision.");
  }
  if (typeof source.ref !== "string" || source.ref.trim() === "") {
    throw new Error("Release marker source ref is missing.");
  }
  if (!Number.isSafeInteger(artifact.files) || artifact.files <= 0) {
    throw new Error("Release marker artifact count must be a positive integer.");
  }
  for (const [label, digest] of [
    ["inventory", artifact.inventorySha256],
    ["worker policy", artifact.workerPolicySha256]
  ]) {
    if (typeof digest !== "string" || !HASH_PATTERN.test(digest)) {
      throw new Error(`Release marker ${label} digest must be lowercase SHA-256.`);
    }
  }

  const cachePrefix = `math-drill-offline-v${marker.version}-`;
  if (
    typeof artifact.cacheId !== "string" ||
    !artifact.cacheId.startsWith(cachePrefix) ||
    !/^[a-f0-9]{16}$/u.test(artifact.cacheId.slice(cachePrefix.length))
  ) {
    throw new Error("Release marker cache identity does not match its version.");
  }

  return Object.freeze({
    cacheId: artifact.cacheId,
    product: PRODUCT_NAME,
    version: marker.version
  });
}

export function validateSecurityHeaders(headers) {
  const contentSecurityPolicy = readHeader(headers, "content-security-policy");
  if (contentSecurityPolicy === null) throw new Error("Content-Security-Policy header is missing.");

  const directives = parseContentSecurityPolicy(contentSecurityPolicy);
  const expectedDirectives = parseContentSecurityPolicy(
    createSecurityHeaders([REFERENCE_SCRIPT_HASH])["Content-Security-Policy"]
  );
  if ([...directives.values()].flat().includes("'unsafe-eval'")) {
    throw new Error("Content-Security-Policy contains an unsafe script allowance.");
  }
  if (directives.size !== expectedDirectives.size) {
    throw new Error("Content-Security-Policy directives must match the generated _headers policy.");
  }

  for (const [name, expectedSources] of expectedDirectives) {
    const sources = directives.get(name);
    if (sources === undefined) throw new Error(`Content-Security-Policy is missing ${name}.`);

    if (name === "script-src") {
      if (
        sources.length < 2 ||
        !sources.includes("'self'") ||
        sources.some((source) => source !== "'self'" && !SCRIPT_HASH_PATTERN.test(source)) ||
        new Set(sources).size !== sources.length
      ) {
        throw new Error(
          "Content-Security-Policy script-src must match the generated _headers policy: self plus SHA-256 hashes only."
        );
      }
      continue;
    }

    if (!sameValues(sources, expectedSources)) {
      throw new Error(`Content-Security-Policy ${name} sources must match the generated _headers policy.`);
    }
  }

  requireHeaderValue(headers, "x-content-type-options", "nosniff");
  requireHeaderValue(headers, "referrer-policy", "no-referrer");
  requireHeaderValue(headers, "x-frame-options", "deny");

  const permissionsPolicy = readHeader(headers, "permissions-policy")?.toLowerCase();
  if (permissionsPolicy === undefined || permissionsPolicy === null) {
    throw new Error("Permissions-Policy header is missing.");
  }
  for (const capability of [
    "accelerometer=()",
    "camera=()",
    "geolocation=()",
    "gyroscope=()",
    "magnetometer=()",
    "microphone=()",
    "payment=()",
    "usb=()"
  ]) {
    if (!permissionsPolicy.includes(capability)) {
      throw new Error(`Permissions-Policy does not disable ${capability.slice(0, -3)}.`);
    }
  }
}

export function validateManifest(value, expectedOrigin) {
  const origin = validateDeploymentOrigin(expectedOrigin);
  const manifest = requireRecord(value, "Web app manifest");

  for (const field of ["id", "start_url", "scope"]) {
    if (manifest[field] !== "/") throw new Error(`Web app manifest ${field} must be origin-root (/).`);
  }
  if (manifest.name !== PRODUCT_NAME || manifest.short_name !== PRODUCT_NAME) {
    throw new Error(`Web app manifest name and short_name must both be ${PRODUCT_NAME}.`);
  }
  if (manifest.display !== "standalone") throw new Error("Web app manifest display must be standalone.");
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    throw new Error("Web app manifest must declare install icons.");
  }

  const icons = manifest.icons.map((value, index) => {
    const icon = requireRecord(value, `Web app manifest icon ${index + 1}`);
    if (
      typeof icon.src !== "string" ||
      !icon.src.startsWith("/") ||
      icon.src.includes("?") ||
      icon.src.includes("#")
    ) {
      throw new Error(`Web app manifest icon ${index + 1} must use an origin-root path without query data.`);
    }

    const url = new URL(icon.src, `${origin}/`);
    if (url.origin !== origin || !url.pathname.startsWith("/icons/")) {
      throw new Error(`Web app manifest icon ${index + 1} must stay under the same-origin /icons/ path.`);
    }
    if (typeof icon.sizes !== "string" || typeof icon.type !== "string") {
      throw new Error(`Web app manifest icon ${index + 1} is missing sizes or type.`);
    }

    return Object.freeze({
      purpose: typeof icon.purpose === "string" ? icon.purpose : "any",
      sizes: icon.sizes,
      src: icon.src,
      type: icon.type
    });
  });

  for (const required of [
    { purpose: "any", size: "192x192", type: "image/png" },
    { purpose: "any", size: "512x512", type: "image/png" },
    { purpose: "maskable", size: "512x512", type: "image/png" }
  ]) {
    const found = icons.some((icon) =>
      icon.type === required.type &&
      icon.sizes.split(/\s+/u).includes(required.size) &&
      icon.purpose.split(/\s+/u).includes(required.purpose)
    );
    if (!found) {
      throw new Error(`Web app manifest is missing a ${required.size} ${required.purpose} ${required.type} icon.`);
    }
  }

  return Object.freeze(icons);
}

export function validateServiceWorkerSource(source, identity) {
  const cacheId = requireRecord(identity, "Release identity").cacheId;
  if (typeof source !== "string" || typeof cacheId !== "string") {
    throw new Error("Service worker source and release cache identity are required.");
  }

  const workerCacheId = source.match(/const CACHE_VERSION = "([^"]+)";/u)?.[1];
  if (workerCacheId === undefined) throw new Error("Service worker CACHE_VERSION declaration is missing.");
  if (workerCacheId !== cacheId) {
    throw new Error(`Service worker cache identity is stale: expected ${cacheId}, received ${workerCacheId}.`);
  }
}

export function validateServiceWorkerCacheControl(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Service worker Cache-Control header is missing.");
  }

  const policy = value.toLowerCase();
  if (policy.includes("immutable")) throw new Error("Service worker must not use immutable caching.");
  if (!policy.includes("no-cache") && !policy.includes("no-store") && !/(?:^|,)\s*max-age=0(?:\s*(?:,|$))/u.test(policy)) {
    throw new Error("Service worker must require revalidation with no-cache, no-store, or max-age=0.");
  }
}

export function findRuntimeRequestViolations(requests, expectedOrigin) {
  const origin = validateDeploymentOrigin(expectedOrigin);
  const violations = new Set();

  for (const request of requests) {
    if (request === null || typeof request !== "object" || typeof request.url !== "string") {
      throw new Error("Runtime request must include a URL and method.");
    }
    const method = typeof request.method === "string" ? request.method.trim().toUpperCase() : "";
    if (method === "") throw new Error("Runtime request must include a URL and method.");

    let url;
    try {
      url = new URL(request.url);
    } catch {
      throw new Error("Runtime request URL is invalid.");
    }
    if ((url.protocol === "http:" || url.protocol === "https:") && url.origin !== origin) {
      violations.add(`external origin ${url.origin}`);
    }
    if (method !== "GET" && method !== "HEAD") {
      violations.add(`${method} request to ${url.origin === "null" ? url.protocol : url.origin}`);
    }
  }

  return [...violations].sort();
}

export async function runPostDeploymentSmoke(input) {
  const origin = validateDeploymentOrigin(input);

  const marker = await runCheck("release marker", async () => {
    const response = await requestDeployment(origin, RELEASE_MARKER_PATH, 200);
    requireContentType(response, ["application/json"]);
    return validateReleaseMarker(await readJsonResponse(response, RELEASE_MARKER_PATH));
  });

  await runCheck("core routes and security headers", async () => {
    for (const route of CORE_ROUTES) {
      const response = await requestDeployment(origin, route, 200);
      requireContentType(response, ["text/html"]);
      validateSecurityHeaders(response.headers);
      await response.body?.cancel();
    }
  });

  await runCheck("unknown-route 404", async () => {
    const response = await requestDeployment(origin, NOT_FOUND_PATH, 404);
    requireContentType(response, ["text/html"]);
    validateSecurityHeaders(response.headers);
    await response.body?.cancel();
  });

  const manifestIcons = await runCheck("manifest and icons", async () => {
    const response = await requestDeployment(origin, MANIFEST_PATH, 200);
    requireContentType(response, ["application/manifest+json", "application/json"]);
    const icons = validateManifest(await readJsonResponse(response, MANIFEST_PATH), origin);

    for (const icon of icons) {
      const iconResponse = await requestDeployment(origin, icon.src, 200);
      requireContentType(iconResponse, [icon.type]);
      validateIconBytes(new Uint8Array(await iconResponse.arrayBuffer()), icon);
    }
    return icons;
  });

  await runCheck("service worker identity and caching", async () => {
    const response = await requestDeployment(origin, SERVICE_WORKER_PATH, 200);
    requireContentType(response, ["text/javascript", "application/javascript"]);
    validateServiceWorkerCacheControl(response.headers.get("cache-control"));
    validateServiceWorkerSource(await response.text(), marker);
  });

  await runCheck("Chromium save, reload, worker update, and offline restart", async () => {
    await runChromiumSmoke(origin, marker);
  });

  return Object.freeze({
    cacheId: marker.cacheId,
    icons: manifestIcons.length,
    origin,
    product: marker.product,
    version: marker.version
  });
}

async function runChromiumSmoke(origin, identity) {
  let chromium;
  try {
    ({ chromium } = await import("@playwright/test"));
  } catch {
    throw new Error("Playwright is unavailable. Run npm ci before the deployment smoke.");
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    throw new Error("Chromium could not start. Install the locked browser with npx playwright install chromium.");
  }

  const context = await browser.newContext({ serviceWorkers: "allow" });
  const networkViolations = new Set();
  const recordRequest = (request) => {
    for (const violation of findRuntimeRequestViolations([
      { method: request.method(), url: request.url() }
    ], origin)) {
      networkViolations.add(violation);
    }
  };
  context.on("request", recordRequest);
  await context.route("**/*", async (route) => {
    const request = route.request();
    const violations = findRuntimeRequestViolations([
      { method: request.method(), url: request.url() }
    ], origin);
    if (violations.length > 0) {
      violations.forEach((value) => networkViolations.add(value));
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  let page = await context.newPage();
  configurePage(page);
  let failure;

  try {
    await openAppRoute(page, origin, "/", "Dashboard | Open Prep");
    await page.waitForFunction(
      async () => (await navigator.serviceWorker.getRegistration("/"))?.active !== undefined,
      undefined,
      { timeout: 20_000 }
    );

    const worker = await page.evaluate(async (cacheId) => {
      const registration = await navigator.serviceWorker.getRegistration("/");
      if (registration === undefined) return undefined;
      await registration.update();
      await navigator.serviceWorker.ready;

      const cacheName = `${cacheId}:static`;
      const cacheNames = await caches.keys();
      let readyValue;
      if (cacheNames.includes(cacheName)) {
        const cache = await caches.open(cacheName);
        readyValue = await (await cache.match(`/__${cacheId}-ready`))?.text();
      }

      return {
        activeScriptUrl: registration.active?.scriptURL,
        cacheNames,
        readyValue,
        scope: registration.scope
      };
    }, identity.cacheId);

    if (worker === undefined) throw new Error("Root-scoped service worker registration is missing.");
    if (worker.scope !== `${origin}/`) throw new Error(`Service worker scope is ${worker.scope}; expected ${origin}/.`);
    if (worker.activeScriptUrl !== `${origin}${SERVICE_WORKER_PATH}`) {
      throw new Error(`Active service worker is not ${origin}${SERVICE_WORKER_PATH}.`);
    }
    if (!worker.cacheNames.includes(`${identity.cacheId}:static`) || worker.readyValue !== identity.cacheId) {
      throw new Error(`Service worker cache ${identity.cacheId}:static is missing or incomplete.`);
    }

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      (scriptUrl) => navigator.serviceWorker.controller?.scriptURL === scriptUrl,
      `${origin}${SERVICE_WORKER_PATH}`,
      { timeout: 20_000 }
    );
    await page.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: SYNTHETIC_STORAGE_KEY, value: SYNTHETIC_STORAGE_VALUE }
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    const savedValue = await page.evaluate((key) => localStorage.getItem(key), SYNTHETIC_STORAGE_KEY);
    if (savedValue !== SYNTHETIC_STORAGE_VALUE) throw new Error("Synthetic local save did not survive reload.");

    await openAppRoute(page, origin, "/drills/", "Drills | Open Prep");
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await assertRenderedApp(page, origin, "/drills/", "Drills | Open Prep");

    await page.close();
    page = await context.newPage();
    configurePage(page);
    await openAppRoute(page, origin, "/drills/", "Drills | Open Prep");
    const restartedValue = await page.evaluate((key) => localStorage.getItem(key), SYNTHETIC_STORAGE_KEY);
    if (restartedValue !== SYNTHETIC_STORAGE_VALUE) {
      throw new Error("Synthetic local save did not survive the offline page restart.");
    }
  } catch (error) {
    failure = error;
  } finally {
    await context.setOffline(false).catch(() => undefined);
    if (!page.isClosed()) {
      await page.evaluate((key) => localStorage.removeItem(key), SYNTHETIC_STORAGE_KEY).catch(() => undefined);
    }
    await context.close();
    await browser.close();
  }

  if (networkViolations.size > 0) {
    throw new Error(`Unexpected runtime network request(s) were blocked: ${[...networkViolations].sort().join(", ")}.`);
  }
  if (failure !== undefined) throw failure;
}

function configurePage(page) {
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(20_000);
}

async function openAppRoute(page, origin, pathname, expectedTitle) {
  await page.goto(`${origin}${pathname}`, { waitUntil: "domcontentloaded" });
  await assertRenderedApp(page, origin, pathname, expectedTitle);
}

async function assertRenderedApp(page, origin, pathname, expectedTitle) {
  const current = new URL(page.url());
  if (current.origin !== origin || current.pathname !== pathname) {
    throw new Error(`Route ${pathname} redirected outside its expected origin-root location.`);
  }
  if (await page.title() !== expectedTitle) {
    throw new Error(`Route ${pathname} did not render the expected ${PRODUCT_NAME} title.`);
  }
  if (await page.locator("main").count() !== 1) {
    throw new Error(`Route ${pathname} did not render one application main region.`);
  }
}

async function requestDeployment(origin, target, expectedStatus) {
  const url = new URL(target, `${origin}/`);
  if (url.origin !== origin) throw new Error(`Refusing to request a resource outside ${origin}.`);

  let response;
  try {
    response = await globalThis.fetch(url, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    throw new Error(`Could not request ${url.pathname}: ${errorMessage(error)}`);
  }

  if (response.status !== expectedStatus) {
    throw new Error(`${url.pathname} returned HTTP ${response.status}; expected ${expectedStatus}.`);
  }
  if (new URL(response.url).origin !== origin) {
    throw new Error(`${url.pathname} resolved outside the declared deployment origin.`);
  }
  return response;
}

async function readJsonResponse(response, pathname) {
  try {
    return JSON.parse(await response.text());
  } catch {
    throw new Error(`${pathname} did not return valid JSON.`);
  }
}

function requireContentType(response, accepted) {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType === undefined || !accepted.includes(contentType)) {
    throw new Error(
      `${new URL(response.url).pathname} returned Content-Type ${contentType ?? "(missing)"}; expected ${accepted.join(" or ")}.`
    );
  }
}

function validateIconBytes(bytes, icon) {
  if (bytes.byteLength === 0) throw new Error(`Manifest icon ${icon.src} is empty.`);

  if (icon.type === "image/png") {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (!signature.every((value, index) => bytes[index] === value)) {
      throw new Error(`Manifest icon ${icon.src} is not a valid PNG response.`);
    }
  }
  if (icon.type === "image/svg+xml") {
    const source = new TextDecoder().decode(bytes.subarray(0, 1_024));
    if (!/<svg\b/iu.test(source)) throw new Error(`Manifest icon ${icon.src} is not a valid SVG response.`);
  }
}

function requireRecord(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

function parseContentSecurityPolicy(value) {
  const directives = new Map();
  for (const entry of value.split(";")) {
    const [name, ...sources] = entry.trim().split(/\s+/u);
    if (name === "") continue;
    const normalizedName = name.toLowerCase();
    if (directives.has(normalizedName)) {
      throw new Error(`Content-Security-Policy contains duplicate ${normalizedName} directives.`);
    }
    directives.set(normalizedName, sources);
  }
  return directives;
}

function sameValues(actual, expected) {
  return (
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    actual.every((value) => expected.includes(value))
  );
}

function readHeader(headers, name) {
  if (typeof headers?.get === "function") return headers.get(name);
  const entry = Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return typeof entry?.[1] === "string" ? entry[1] : null;
}

function requireHeaderValue(headers, name, expected) {
  const value = readHeader(headers, name);
  if (value?.toLowerCase() !== expected) {
    throw new Error(`${name} must be ${expected}; received ${value ?? "(missing)"}.`);
  }
}

async function runCheck(label, task) {
  try {
    const result = await task();
    console.log(`PASS ${label}`);
    return result;
  } catch (error) {
    throw new Error(`${label} failed: ${errorMessage(error)}`);
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function parseArguments(argumentsList) {
  if (argumentsList.length !== 1) {
    throw new Error("Usage: node scripts/post-deployment-smoke.mjs https://open-prep.example/");
  }
  return validateDeploymentOrigin(argumentsList[0]);
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await runPostDeploymentSmoke(parseArguments(process.argv.slice(2)));
    console.log(`Post-deployment smoke passed for ${result.product} ${result.version} at ${result.origin}.`);
  } catch (error) {
    console.error(`Post-deployment smoke failed: ${errorMessage(error)}`);
    process.exitCode = 1;
  }
}
