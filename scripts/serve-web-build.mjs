import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { constants, createBrotliCompress, createGzip } from "node:zlib";

import {
  RELEASE_MARKER_FILENAME,
  validateReleaseOutput,
  validateRequiredStaticArtifacts
} from "./release-contract.mjs";

const rootDirectory = path.resolve("out");
const host = "127.0.0.1";
const port = Number(process.env.PORT ?? "3000");
const argumentsList = process.argv.slice(2);
const allowUnverified = argumentsList.includes("--allow-unverified");

if (argumentsList.some((argument) => argument !== "--allow-unverified")) {
  throw new Error("Usage: node scripts/serve-web-build.mjs [--allow-unverified]");
}

const packageJson = JSON.parse(await readFile(path.resolve("package.json"), "utf8"));
const markerExists = await stat(path.join(rootDirectory, RELEASE_MARKER_FILENAME)).then(
  (markerStats) => markerStats.isFile(),
  () => false
);

if (!allowUnverified || markerExists) {
  await validateReleaseOutput(rootDirectory, { version: packageJson.version });
} else {
  await validateRequiredStaticArtifacts(rootDirectory);
  console.warn("Serving an unverified developer build. Release and E2E gates must not use --allow-unverified.");
}
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".woff2", "font/woff2"]
]);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer from 1 through 65535.");
}

await stat(rootDirectory).catch(() => {
  throw new Error("Static web build not found. Run `npm run build` first.");
});

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    let filePath = path.resolve(rootDirectory, pathname.replace(/^\/+/, ""));
    let statusCode = 200;

    if (filePath !== rootDirectory && !filePath.startsWith(`${rootDirectory}${path.sep}`)) {
      response.writeHead(403).end();
      return;
    }

    let fileStats = await stat(filePath).catch(() => undefined);

    if (fileStats?.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      fileStats = await stat(filePath).catch(() => undefined);
    }

    if (!fileStats?.isFile()) {
      const parsedPath = path.parse(filePath);
      const routeSegments = parsedPath.name.split(".");

      if (parsedPath.ext === ".txt" && routeSegments[0] === "__next" && routeSegments.length >= 3) {
        filePath = path.join(
          parsedPath.dir,
          `${routeSegments[0]}.${routeSegments[1]}`,
          ...routeSegments.slice(2, -1),
          `${routeSegments.at(-1)}${parsedPath.ext}`
        );
        fileStats = await stat(filePath).catch(() => undefined);
      }
    }

    if (!fileStats?.isFile()) {
      filePath = path.join(rootDirectory, "404.html");
      fileStats = await stat(filePath).catch(() => undefined);
      statusCode = 404;

      if (!fileStats?.isFile()) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
        return;
      }
    }

    const contentType = mimeTypes.get(path.extname(filePath)) ?? "application/octet-stream";
    const encoding = fileStats.size >= 1024 && isCompressible(contentType)
      ? selectContentEncoding(request.headers["accept-encoding"])
      : undefined;
    const headers = {
      "Cache-Control": cacheControl(pathname),
      "Content-Type": contentType,
      "Vary": "Accept-Encoding"
    };

    if (encoding !== undefined) headers["Content-Encoding"] = encoding;

    response.writeHead(statusCode, headers);

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    const file = createReadStream(filePath);
    if (encoding === "br") {
      file.pipe(createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 4 } })).pipe(response);
    } else if (encoding === "gzip") {
      file.pipe(createGzip()).pipe(response);
    } else {
      file.pipe(response);
    }
  } catch (error) {
    response.writeHead(error instanceof URIError ? 400 : 500).end();
  }
});

server.listen(port, host, () => {
  console.log(`Static web build available at http://127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close());
}

function cacheControl(pathname) {
  if (pathname === "/sw.js") return "no-cache";
  if (pathname.startsWith("/_next/static/")) return "public, max-age=31536000, immutable";
  return "public, max-age=0, must-revalidate";
}

function isCompressible(contentType) {
  return contentType.startsWith("text/") || contentType.includes("json") || contentType.includes("javascript") || contentType.includes("svg");
}

function selectContentEncoding(header = "") {
  const accepted = new Map(
    header.split(",").map((entry) => {
      const [name, ...parameters] = entry.trim().toLowerCase().split(";");
      const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
      return [name, quality === undefined ? 1 : Number(quality.trim().slice(2))];
    })
  );
  const accepts = (name) => (accepted.get(name) ?? accepted.get("*") ?? 0) > 0;

  if (accepts("br")) return "br";
  if (accepts("gzip")) return "gzip";
  return undefined;
}
