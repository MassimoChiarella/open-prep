import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const STATIC_SECURITY_HEADERS_FILENAME = "_headers";

const fixedHeaders = Object.freeze({
  "Permissions-Policy": "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
});

export async function writeStaticSecurityHeaders(outputDirectory) {
  const headers = createSecurityHeaders(await collectInlineScriptHashes(outputDirectory));
  const contents = serializeStaticSecurityHeaders(headers);
  await writeFile(path.join(outputDirectory, STATIC_SECURITY_HEADERS_FILENAME), contents, "utf8");
  return headers;
}

export async function readStaticSecurityHeaders(outputDirectory) {
  const contents = await readFile(path.join(outputDirectory, STATIC_SECURITY_HEADERS_FILENAME), "utf8");
  return parseStaticSecurityHeaders(contents);
}

export function createSecurityHeaders(inlineScriptHashes = []) {
  const scriptSources = [
    "'self'",
    ...[...new Set(inlineScriptHashes)].toSorted().map((hash) => `'sha256-${hash}'`)
  ];
  const contentSecurityPolicy = [
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
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:"
  ].join("; ");

  return Object.freeze({
    "Content-Security-Policy": contentSecurityPolicy,
    ...fixedHeaders
  });
}

export function serializeStaticSecurityHeaders(headers) {
  return `/*\n${Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`).join("\n")}\n`;
}

export function parseStaticSecurityHeaders(contents) {
  const lines = contents.split(/\r?\n/u).filter((line) => line.trim() !== "");
  if (lines.shift()?.trim() !== "/*") {
    throw new Error("Static security headers must begin with the /* route pattern.");
  }

  const headers = {};
  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator < 1) throw new Error(`Invalid static security header: ${line.trim()}`);
    const name = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (name in headers || value === "") throw new Error(`Invalid static security header: ${line.trim()}`);
    headers[name] = value;
  }
  return Object.freeze(headers);
}

async function collectInlineScriptHashes(outputDirectory) {
  const hashes = new Set();

  for (const file of await listHtmlFiles(outputDirectory)) {
    const contents = await readFile(file, "utf8");
    for (const match of contents.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/giu)) {
      if (/\bsrc\s*=/iu.test(match[1]) || match[2] === "") continue;
      hashes.add(createHash("sha256").update(match[2], "utf8").digest("base64"));
    }
  }

  return [...hashes].toSorted();
}

async function listHtmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listHtmlFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(entryPath);
    }
  }
  return files.toSorted();
}
