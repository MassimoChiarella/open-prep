import { spawnSync } from "node:child_process";
import path from "node:path";
import type { Page } from "@playwright/test";

import { describe, expect, it } from "vitest";

import {
  findRuntimeRequestViolations,
  validateDeploymentOrigin,
  validateManifest,
  validateReleaseMarker,
  validateSecurityHeaders,
  validateServiceWorkerCacheControl,
  validateServiceWorkerSource,
  waitForActiveServiceWorker
} from "../../../scripts/post-deployment-smoke.mts";

const origin = "https://prep.example";
const analyticsOrigin = "https://openprep.app";
const analyticsPayload = {
  o: `${analyticsOrigin}/drills/`,
  sv: "0.1.3",
  sdkn: "@vercel/analytics",
  sdkv: "2.0.1",
  ts: 1_788_321_600_000
};
const analyticsRequest = {
  method: "POST",
  postData: JSON.stringify(analyticsPayload),
  url: `${analyticsOrigin}/_vercel/insights/view`
};
const version = "1.2.3";
const cacheId = `math-drill-offline-v${version}-${"a".repeat(16)}`;
const scriptHash = `'sha256-${"A".repeat(43)}='`;
const marker = {
  artifact: {
    cacheId,
    files: 42,
    inventorySha256: "b".repeat(64),
    workerPolicySha256: "c".repeat(64)
  },
  product: "Open Prep",
  schemaVersion: 1,
  source: {
    clean: true,
    commit: "d".repeat(40),
    ref: "refs/tags/v1.2.3"
  },
  version
};
const securityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "img-src 'self' data: blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    `script-src 'self' ${scriptHash}`,
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:"
  ].join("; "),
  "Permissions-Policy": "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};
const manifest = {
  display: "standalone",
  icons: [
    { purpose: "any", sizes: "192x192", src: "/icons/app-icon-192.png", type: "image/png" },
    { purpose: "any", sizes: "512x512", src: "/icons/app-icon-512.png", type: "image/png" },
    { purpose: "maskable", sizes: "512x512", src: "/icons/maskable-icon-512.png", type: "image/png" },
    { purpose: "any", sizes: "any", src: "/icons/app-icon.svg", type: "image/svg+xml" }
  ],
  id: "/",
  name: "OpenPrep",
  scope: "/",
  short_name: "OpenPrep",
  start_url: "/"
};

describe("post-deployment smoke contract", () => {
  it("waits for asynchronous registration and activation before checking the offline cache", async () => {
    const states = [undefined, undefined, "activating", "activated"];
    let calls = 0;
    const page = {
      evaluate: async () => states[calls++]
    } as unknown as Page;

    await waitForActiveServiceWorker(page);

    expect(calls).toBe(4);
  });

  it("accepts only an explicit credential-free HTTPS origin root", () => {
    expect(validateDeploymentOrigin(origin)).toBe(origin);
    expect(validateDeploymentOrigin(`${origin}/`)).toBe(origin);

    for (const invalid of [
      "http://prep.example/",
      "https://person:secret@prep.example/",
      "https://prep.example/project/",
      "https://prep.example/?mode=smoke",
      "https://prep.example/#status"
    ]) {
      expect(() => validateDeploymentOrigin(invalid), invalid).toThrow();
    }
  });

  it("validates product, version, clean provenance, and worker cache identity", () => {
    expect(validateReleaseMarker(marker)).toEqual({ cacheId, product: "Open Prep", version });
    expect(() => validateReleaseMarker({ ...marker, product: "Other" })).toThrow("schema or product");
    expect(() => validateReleaseMarker({
      ...marker,
      artifact: { ...marker.artifact, cacheId: "math-drill-offline-v1.2.2-aaaaaaaaaaaaaaaa" }
    })).toThrow("cache identity");
    expect(() => validateReleaseMarker({
      ...marker,
      source: { ...marker.source, clean: false }
    })).toThrow("clean source revision");
  });

  it("enforces the static security-header policy without unsafe script allowances", () => {
    expect(() => validateSecurityHeaders(securityHeaders)).not.toThrow();
    expect(() => validateSecurityHeaders({
      ...securityHeaders,
      "Content-Security-Policy": securityHeaders["Content-Security-Policy"].replace(
        `script-src 'self' ${scriptHash}`,
        "script-src 'self' 'unsafe-eval'"
      )
    })).toThrow(/SHA-256|unsafe script/u);
    for (const weakenedPolicy of [
      securityHeaders["Content-Security-Policy"].replace("default-src 'self'", "default-src 'self' https:"),
      securityHeaders["Content-Security-Policy"].replace("connect-src 'self'", "connect-src 'self' *"),
      securityHeaders["Content-Security-Policy"].replace(
        `script-src 'self' ${scriptHash}`,
        `script-src 'self' ${scriptHash} https://cdn.example`
      )
    ]) {
      expect(() => validateSecurityHeaders({
        ...securityHeaders,
        "Content-Security-Policy": weakenedPolicy
      }), weakenedPolicy).toThrow("generated _headers policy");
    }
    expect(() => validateSecurityHeaders({
      ...securityHeaders,
      "X-Content-Type-Options": undefined
    })).toThrow("x-content-type-options");
  });

  it("requires an origin-root install manifest and same-origin install icons", () => {
    expect(validateManifest(manifest, origin)).toHaveLength(4);
    expect(() => validateManifest({ ...manifest, scope: "/project/" }, origin)).toThrow("scope");
    expect(() => validateManifest({
      ...manifest,
      icons: manifest.icons.map((icon, index) => index === 0 ? { ...icon, src: "https://cdn.example/icon.png" } : icon)
    }, origin)).toThrow("origin-root path");
    expect(() => validateManifest({
      ...manifest,
      icons: manifest.icons.filter((icon) => icon.purpose !== "maskable")
    }, origin)).toThrow("maskable");
  });

  it("detects stale or immutably cached service workers", () => {
    expect(() => validateServiceWorkerSource(`const CACHE_VERSION = "${cacheId}";`, { cacheId })).not.toThrow();
    expect(() => validateServiceWorkerCacheControl("public, max-age=0, must-revalidate")).not.toThrow();
    expect(() => validateServiceWorkerCacheControl("no-cache")).not.toThrow();

    expect(() => validateServiceWorkerSource(
      'const CACHE_VERSION = "math-drill-offline-v1.2.2-bbbbbbbbbbbbbbbb";',
      { cacheId }
    )).toThrow("stale");
    expect(() => validateServiceWorkerCacheControl("public, max-age=31536000, immutable")).toThrow("immutable");
  });

  it("blocks same-origin writes and external HTTP origins without preserving private URL data", () => {
    const violations = findRuntimeRequestViolations([
      { method: "GET", url: `${origin}/_next/static/app.js` },
      { method: "HEAD", url: `${origin}/manifest.webmanifest` },
      { method: "GET", url: "data:image/png;base64,AAAA" },
      { method: "GET", url: "blob:https://prep.example/id" },
      { method: "POST", url: `${origin}/save?private=discarded` },
      { method: "PUT", url: `${origin}/replace/private-answer` },
      { method: "GET", url: "https://telemetry.example/collect?private=discarded" }
    ], origin);

    expect(violations).toEqual([
      "POST request to https://prep.example",
      "PUT request to https://prep.example",
      "external origin https://telemetry.example"
    ]);
    expect(JSON.stringify(violations)).not.toContain("private");
  });

  it("allows sanitized production pageviews with an optional HTTP referrer", () => {
    for (const payload of [
      analyticsPayload,
      { ...analyticsPayload, r: "" },
      { ...analyticsPayload, r: "https://search.example/results?q=consulting" },
      { ...analyticsPayload, r: "http://example.com/" }
    ]) {
      expect(findRuntimeRequestViolations([
        { ...analyticsRequest, postData: JSON.stringify(payload) }
      ], analyticsOrigin)).toEqual([]);
    }
  });

  it("limits the analytics exception to the exact production POST endpoint", () => {
    for (const request of [
      { ...analyticsRequest, method: "PUT" },
      { ...analyticsRequest, url: `${analyticsOrigin}/_vercel/insights/event` },
      { ...analyticsRequest, url: `${analyticsRequest.url}/` },
      { ...analyticsRequest, url: `${analyticsRequest.url}?private=answer` },
      { ...analyticsRequest, url: `${analyticsRequest.url}#private` },
      { ...analyticsRequest, url: `${analyticsRequest.url}?` },
      { ...analyticsRequest, url: `${analyticsRequest.url}#` },
      { ...analyticsRequest, url: "https://person:secret@openprep.app/_vercel/insights/view" },
      { ...analyticsRequest, url: "http://openprep.app/_vercel/insights/view" },
      { ...analyticsRequest, url: `${origin}/_vercel/insights/view` },
      { ...analyticsRequest, url: "https://www.openprep.app/_vercel/insights/view" }
    ]) {
      expect(findRuntimeRequestViolations([request], analyticsOrigin), request.url).not.toEqual([]);
    }
    expect(findRuntimeRequestViolations([analyticsRequest], origin)).toEqual([
      "POST request to https://openprep.app",
      "external origin https://openprep.app"
    ]);
  });

  it("rejects pageview URLs containing private data or non-public routes", () => {
    for (const url of [
      `${analyticsOrigin}/drills/?answer=private`,
      `${analyticsOrigin}/drills/#private`,
      `${analyticsOrigin}/private-answer/`,
      `${analyticsOrigin}/drills`,
      "https://person:secret@openprep.app/drills/",
      "http://openprep.app/drills/",
      `${origin}/drills/`,
      "/drills/"
    ]) {
      const violations = findRuntimeRequestViolations([
        { ...analyticsRequest, postData: JSON.stringify({ ...analyticsPayload, o: url }) }
      ], analyticsOrigin);
      expect(violations, url).toEqual(["POST request to https://openprep.app"]);
    }
  });

  it("rejects custom event data, flags, unknown fields, and invalid pageview metadata", () => {
    for (const payload of [
      null, [], {}, "pageview",
      { ...analyticsPayload, o: 42 },
      { ...analyticsPayload, en: "answer" },
      { ...analyticsPayload, ed: { answer: "private" } },
      { ...analyticsPayload, f: {} },
      { ...analyticsPayload, dp: "/drills/" },
      { ...analyticsPayload, extra: "private" },
      { ...analyticsPayload, sv: "other" },
      { ...analyticsPayload, sdkn: "@vercel/analytics/next" },
      { ...analyticsPayload, sdkv: 2 },
      { ...analyticsPayload, ts: "1788321600000" },
      { ...analyticsPayload, ts: 0 },
      { ...analyticsPayload, ts: 1.5 },
      { ...analyticsPayload, ts: Number.MAX_SAFE_INTEGER + 1 },
      { ...analyticsPayload, r: null },
      { ...analyticsPayload, r: "relative/path" },
      { ...analyticsPayload, r: "javascript:alert(1)" },
      { ...analyticsPayload, r: "data:text/plain,private" }
    ]) {
      expect(findRuntimeRequestViolations([
        { ...analyticsRequest, postData: JSON.stringify(payload) }
      ], analyticsOrigin)).toEqual(["POST request to https://openprep.app"]);
    }
    for (const key of Object.keys(analyticsPayload)) {
      const payload: Record<string, unknown> = { ...analyticsPayload };
      delete payload[key];
      expect(findRuntimeRequestViolations([
        { ...analyticsRequest, postData: JSON.stringify(payload) }
      ], analyticsOrigin), key).toEqual(["POST request to https://openprep.app"]);
    }
    for (const postData of [undefined, null, "", "{invalid"]) {
      expect(findRuntimeRequestViolations([
        { ...analyticsRequest, postData }
      ], analyticsOrigin)).toEqual(["POST request to https://openprep.app"]);
    }
  });

  it("fails without exactly one explicit origin before starting network or browser work", () => {
    const result = spawnSync(process.execPath, [path.resolve("scripts/post-deployment-smoke.mts")], {
      encoding: "utf8"
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Usage: node scripts/post-deployment-smoke.mts");
  });
});
