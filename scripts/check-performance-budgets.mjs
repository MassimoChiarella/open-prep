import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { brotliCompressSync, constants } from "node:zlib";

const outputDirectory = path.resolve("out");
const limits = {
  largestJavaScriptBytes: 500 * 1024,
  routeJavaScriptBrotliBytes: 480 * 1024,
  serviceWorkerPrecacheBytes: 1350 * 1024
};

await stat(outputDirectory).catch(() => {
  throw new Error("Static web build not found. Run `npm run build` before `npm run perf:check`.");
});

const files = await listFiles(outputDirectory);
const javascriptFiles = files.filter((file) => file.endsWith(".js"));
const javascript = new Map();

for (const file of javascriptFiles) {
  const contents = await readFile(file);
  javascript.set(toPublicUrl(file), {
    brotli: brotliCompressSync(contents, { params: { [constants.BROTLI_PARAM_QUALITY]: 4 } }).byteLength,
    bytes: contents.byteLength
  });
}

const largestJavaScript = [...javascript.entries()].sort((left, right) => right[1].bytes - left[1].bytes)[0];
const routeTotals = [];

for (const file of files.filter((candidate) => candidate.endsWith("index.html"))) {
  const html = await readFile(file, "utf8");
  const urls = new Set([...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((match) => match[1]));
  const brotli = [...urls].reduce((total, url) => total + (javascript.get(url)?.brotli ?? 0), 0);
  routeTotals.push([toRoute(file), brotli]);
}

routeTotals.sort((left, right) => right[1] - left[1]);
const largestRoute = routeTotals[0];
const buildState = JSON.parse(await readFile(path.resolve(".next/open-prep-build-state.json"), "utf8"));
if (buildState?.schemaVersion !== 1 || !Array.isArray(buildState.corePaths)) {
  throw new Error("Generated Open Prep build state is missing or malformed. Run the normal build command first.");
}
const precachePaths = new Set(buildState.corePaths);
let precacheBytes = 0;

for (const relativePath of precachePaths) {
  const file = path.join(outputDirectory, ...relativePath.split("/"));
  const fileStats = await stat(file).catch(() => undefined);
  if (!fileStats?.isFile()) throw new Error(`Core precache artifact is missing from the static build: ${relativePath}`);
  precacheBytes += fileStats.size;
}

const measurements = [
  ["largest JavaScript chunk", largestJavaScript?.[1].bytes ?? 0, limits.largestJavaScriptBytes, largestJavaScript?.[0] ?? "none"],
  ["largest route JavaScript (Brotli)", largestRoute?.[1] ?? 0, limits.routeJavaScriptBrotliBytes, largestRoute?.[0] ?? "none"],
  ["service-worker install precache", precacheBytes, limits.serviceWorkerPrecacheBytes, `${precachePaths.size} files`]
];

for (const [label, actual, limit, detail] of measurements) {
  console.log(`${label}: ${formatBytes(actual)} / ${formatBytes(limit)} (${detail})`);
}

const failures = measurements.filter(([, actual, limit]) => actual > limit);
if (failures.length > 0) {
  throw new Error(`Performance budget exceeded: ${failures.map(([label]) => label).join(", ")}`);
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  }))).flat();
}

function toPublicUrl(file) {
  return `/${path.relative(outputDirectory, file).replaceAll(path.sep, "/")}`;
}

function toRoute(file) {
  const relative = path.relative(outputDirectory, path.dirname(file)).replaceAll(path.sep, "/");
  return relative === "" ? "/" : `/${relative}/`;
}

function formatBytes(value) {
  return `${(value / 1024).toFixed(1)} KiB`;
}
