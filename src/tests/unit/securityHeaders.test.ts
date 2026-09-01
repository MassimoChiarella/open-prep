import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  STATIC_SECURITY_HEADERS_FILENAME,
  parseStaticSecurityHeaders,
  readStaticSecurityHeaders,
  writeStaticSecurityHeaders
} from "../../../scripts/security-headers.mts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("static deployment security headers", () => {
  it("generates stable CSP hashes from every inline build script", async () => {
    const outputDirectory = await createOutput();
    const firstScript = "self.__next_f.push([1]);";
    const secondScript = "self.__next_f.push([2]);";
    await writeFile(path.join(outputDirectory, "index.html"), `<script>${firstScript}</script><script src="/app.js"></script>`);
    await mkdir(path.join(outputDirectory, "drills"));
    await writeFile(path.join(outputDirectory, "drills", "index.html"), `<script>${secondScript}</script><script>${firstScript}</script>`);

    await writeStaticSecurityHeaders(outputDirectory);
    const headers = await readStaticSecurityHeaders(outputDirectory);
    const policy = headers["Content-Security-Policy"];

    expect(policy).toContain(`'sha256-${digest(firstScript)}'`);
    expect(policy).toContain(`'sha256-${digest(secondScript)}'`);
    expect(policy?.match(/'sha256-/gu)).toHaveLength(2);
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("unsafe-eval");
    expect(headers).toMatchObject({
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY"
    });
    expect(await readFile(path.join(outputDirectory, STATIC_SECURITY_HEADERS_FILENAME), "utf8")).toMatch(/^\/\*\r?\n/u);
  });

  it("rejects malformed or duplicate generated header entries", () => {
    expect(() => parseStaticSecurityHeaders("Content-Security-Policy: default-src 'self'\n")).toThrow("must begin");
    expect(() => parseStaticSecurityHeaders("/*\n  Referrer-Policy: no-referrer\n  Referrer-Policy: same-origin\n")).toThrow("Invalid");
  });
});

async function createOutput() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "open-prep-security-headers-"));
  temporaryDirectories.push(directory);
  return directory;
}

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest("base64");
}
