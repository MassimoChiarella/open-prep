import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const publicDirectory = path.join(projectRoot, "public");
const checkOnly = process.argv.includes("--check");
const revision = "2026-08-29";
const markerPattern = /<!-- BEGIN EMBEDDED FILE: ([^>\r\n]+) -->\r?\n(?:[ \t]*\r?\n)*```json\r?\n[\s\S]*?\r?\n```\r?\n(?:[ \t]*\r?\n)*<!-- END EMBEDDED FILE: \1 -->/g;
const bundles = [
  {
    filename: "math-drill-ai-pack-fixed-numeric-complete.md",
    title: "Fixed Numeric",
    kind: "fixed_numeric",
    module: "math-drill-ai-pack-fixed-numeric-kit.md",
    assets: [
      "question-pack-v2.schema.json",
      "question-pack-starter.mathdrill.json",
      "question-pack-example.mathdrill.json"
    ]
  },
  {
    filename: "math-drill-ai-pack-generated-template-complete.md",
    title: "Generated Templates and Interview Math",
    kind: "generated_template",
    module: "math-drill-ai-pack-generated-template-kit.md",
    assets: [
      "question-pack-v2.schema.json",
      "question-pack-template-example.mathdrill.json",
      "question-pack-interview-math-example.mathdrill.json"
    ]
  },
  {
    filename: "math-drill-ai-pack-exhibit-complete.md",
    title: "Exhibits and Charts",
    kind: "exhibit",
    module: "math-drill-ai-pack-exhibit-kit.md",
    assets: [
      "question-pack-v2.schema.json",
      "question-pack-exhibit-example.mathdrill.json",
      "question-pack-chart-example.mathdrill.json",
      "question-pack-visualization-cookbook.mathdrill.json"
    ]
  },
  {
    filename: "math-drill-ai-pack-market-sizing-complete.md",
    title: "Market Sizing",
    kind: "market_sizing",
    module: "math-drill-ai-pack-market-sizing-kit.md",
    assets: [
      "question-pack-v2.schema.json",
      "question-pack-market-sizing-example.mathdrill.json",
      "question-pack-market-sizing-cookbook.mathdrill.json"
    ]
  },
  {
    filename: "math-drill-ai-pack-benchmark-complete.md",
    title: "Benchmarks",
    kind: "benchmark",
    module: "math-drill-ai-pack-benchmark-kit.md",
    assets: [
      "question-pack-v2.schema.json",
      "question-pack-benchmark-example.mathdrill.json"
    ]
  },
  {
    filename: "math-drill-ai-pack-case-practice-complete.md",
    title: "Case Practice v2 and v3",
    kind: "case_practice",
    module: "math-drill-ai-pack-case-practice-kit.md",
    assets: [
      "question-pack-v2.schema.json",
      "question-pack-v3.schema.json",
      "question-pack-case-practice-example.mathdrill.json",
      "question-pack-case-questioning-example.mathdrill.json",
      "question-pack-v3-full-case-example.mathdrill.json"
    ]
  }
];

const omnibusPath = path.join(publicDirectory, "math-drill-ai-pack-authoring-kit.md");
const omnibus = await readFile(omnibusPath, "utf8");
const synchronizedOmnibus = await synchronizeEmbeddedFiles(omnibus);
const changes = [];

if (synchronizedOmnibus !== omnibus) {
  changes.push({ content: synchronizedOmnibus, filename: path.basename(omnibusPath) });
}

for (const bundle of bundles) {
  const rendered = await renderBundle(bundle);
  let current = "";

  try {
    current = await readFile(path.join(publicDirectory, bundle.filename), "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  if (current !== rendered) {
    changes.push({ content: rendered, filename: bundle.filename });
  }
}

if (checkOnly) {
  if (changes.length > 0) {
    console.error(`Authoring assets are stale or missing: ${changes.map(({ filename }) => filename).join(", ")}. Run npm run authoring:sync.`);
    process.exitCode = 1;
  }
} else {
  for (const change of changes) {
    await writeFile(path.join(publicDirectory, change.filename), change.content, "utf8");
  }

  console.log(`Synchronized the omnibus and ${bundles.length} complete authoring bundles${changes.length === 0 ? " (already current)" : ""}.`);
}

async function synchronizeEmbeddedFiles(document) {
  const lineEnding = document.includes("\r\n") ? "\r\n" : "\n";
  const matches = [...document.matchAll(markerPattern)];
  const beginMarkerCount = [...document.matchAll(/<!-- BEGIN EMBEDDED FILE:/g)].length;
  const endMarkerCount = [...document.matchAll(/<!-- END EMBEDDED FILE:/g)].length;

  if (matches.length === 0 || matches.length !== beginMarkerCount || matches.length !== endMarkerCount) {
    throw new Error(
      `Found ${beginMarkerCount} begin markers, ${endMarkerCount} end markers, and ${matches.length} complete JSON blocks.`
    );
  }

  let cursor = 0;
  let synchronized = "";

  for (const match of matches) {
    const assetName = match[1];
    const canonical = await readCanonicalAsset(assetName, lineEnding);

    synchronized += document.slice(cursor, match.index);
    synchronized += embedJson(assetName, canonical, lineEnding);
    cursor = (match.index ?? 0) + match[0].length;
  }

  return synchronized + document.slice(cursor);
}

async function renderBundle({ assets, kind, module, title }) {
  const lineEnding = "\n";
  const start = normalize(await readFile(path.join(publicDirectory, "math-drill-ai-pack-authoring-start.md"), "utf8"));
  const focusedModule = normalize(await readFile(path.join(publicDirectory, module), "utf8"));
  const embeddedAssets = [];

  for (const assetName of assets) {
    const canonical = await readCanonicalAsset(assetName, lineEnding);
    embeddedAssets.push(`### ${assetName}\n\n${embedJson(assetName, canonical, lineEnding)}`);
  }

  return [
    "<!-- GENERATED FILE. Edit the component guides or canonical JSON assets, then run npm run authoring:sync. -->",
    `# Open Prep Complete AI Authoring Bundle: ${title}`,
    "",
    `Bundle revision: **${revision}**`,
    "",
    `This one Markdown attachment is self-contained for \`kind: "${kind}"\`. The package family is already resolved. Give this file and the user's authorized source material to the LLM; no second guide, schema, or example attachment is needed.`,
    "",
    "Follow the common rules and focused-family module below. The embedded schemas are structural authority, the embedded examples are complete importer-valid patterns, and the focused checklist is the required subtype/preflight review. Never copy illustrative facts, rights metadata, or answer keys unless they are accurate and authorized for the new package.",
    "",
    `Generated from \`math-drill-ai-pack-authoring-start.md\`, \`${module}\`, and the named canonical JSON assets.`,
    "",
    "## Common trust, privacy, output, size, and repair rules",
    "",
    "<!-- BEGIN AUTHORING COMPONENT: math-drill-ai-pack-authoring-start.md -->",
    start,
    "<!-- END AUTHORING COMPONENT: math-drill-ai-pack-authoring-start.md -->",
    "",
    `## Focused family module: ${title}`,
    "",
    `<!-- BEGIN AUTHORING COMPONENT: ${module} -->`,
    focusedModule,
    `<!-- END AUTHORING COMPONENT: ${module} -->`,
    "",
    "## Full canonical schemas and complete examples",
    "",
    "Use these files as references while creating one new package. Do not output a schema or concatenate examples with the package. The final response must still follow the common binding output contract.",
    "",
    embeddedAssets.join("\n\n"),
    ""
  ].join(lineEnding);
}

async function readCanonicalAsset(assetName, lineEnding) {
  if (path.basename(assetName) !== assetName || !/^[a-z0-9][a-z0-9._-]*\.json$/.test(assetName)) {
    throw new Error(`Unsafe embedded asset name: ${assetName}`);
  }

  const canonical = normalize(await readFile(path.join(publicDirectory, assetName), "utf8"));
  JSON.parse(canonical);
  return canonical.replace(/\n/g, lineEnding);
}

function embedJson(assetName, canonical, lineEnding) {
  return [
    `<!-- BEGIN EMBEDDED FILE: ${assetName} -->`,
    "```json",
    canonical,
    "```",
    `<!-- END EMBEDDED FILE: ${assetName} -->`
  ].join(lineEnding);
}

function normalize(value) {
  return value.trim().replace(/\r?\n/g, "\n");
}
