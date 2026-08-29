import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const rootDirectory = path.resolve("out");
const host = "127.0.0.1";
const port = Number(process.env.PORT ?? "3000");
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
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
      response.writeHead(404).end("Not found");
      return;
    }

    const headers = {
      "Cache-Control": pathname === "/sw.js" ? "no-cache" : "public, max-age=0, must-revalidate",
      "Content-Type": mimeTypes.get(path.extname(filePath)) ?? "application/octet-stream"
    };

    response.writeHead(200, headers);

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    createReadStream(filePath).pipe(response);
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
