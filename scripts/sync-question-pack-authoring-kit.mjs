import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const publicDirectory = path.join(projectRoot, "public");
const kitPath = path.join(publicDirectory, "math-drill-ai-pack-authoring-kit.md");
const checkOnly = process.argv.includes("--check");
const markerPattern = /<!-- BEGIN EMBEDDED FILE: ([^>\r\n]+) -->\r?\n(?:[ \t]*\r?\n)*```json\r?\n[\s\S]*?\r?\n```\r?\n(?:[ \t]*\r?\n)*<!-- END EMBEDDED FILE: \1 -->/g;

const kit = await readFile(kitPath, "utf8");
const lineEnding = kit.includes("\r\n") ? "\r\n" : "\n";
const matches = [...kit.matchAll(markerPattern)];
const beginMarkerCount = [...kit.matchAll(/<!-- BEGIN EMBEDDED FILE:/g)].length;

if (matches.length === 0 || matches.length !== beginMarkerCount) {
  throw new Error(`Found ${beginMarkerCount} embedded-file markers but ${matches.length} complete JSON blocks.`);
}

let cursor = 0;
let synchronized = "";

for (const match of matches) {
  const assetName = match[1];

  if (path.basename(assetName) !== assetName || !assetName.endsWith(".json")) {
    throw new Error(`Unsafe embedded asset name: ${assetName}`);
  }

  const canonical = (await readFile(path.join(publicDirectory, assetName), "utf8"))
    .trim()
    .replace(/\r?\n/g, lineEnding);
  JSON.parse(canonical);

  synchronized += kit.slice(cursor, match.index);
  synchronized += [
    `<!-- BEGIN EMBEDDED FILE: ${assetName} -->`,
    "```json",
    canonical,
    "```",
    `<!-- END EMBEDDED FILE: ${assetName} -->`
  ].join(lineEnding);
  cursor = (match.index ?? 0) + match[0].length;
}

synchronized += kit.slice(cursor);

if (checkOnly) {
  if (synchronized !== kit) {
    console.error("The AI authoring kit is out of sync. Run npm run authoring:sync.");
    process.exitCode = 1;
  }
} else if (synchronized !== kit) {
  await writeFile(kitPath, synchronized, "utf8");
  console.log(`Synchronized ${matches.length} embedded authoring assets.`);
}
