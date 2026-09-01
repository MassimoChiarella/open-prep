import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = posix.join("public", "community-packs");
const manifestFile = posix.join(sourceDirectory, "catalog.v1.json");
const packFileName = "pack.mathdrill.json";
const reviewFileName = "review.json";
const fixedImportedAt = "1970-01-01T00:00:00.000Z";
const safeIdPattern = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const difficultyOrder = ["beginner", "intermediate", "advanced", "expert"];

export async function createCanonicalPackTools(root = projectRoot) {
  const { createServer } = await import("vite");
  const server = await createServer({
    appType: "custom",
    configFile: false,
    envFile: false,
    logLevel: "silent",
    resolve: { alias: { "@": resolve(root, "src") } },
    root,
    server: { middlewareMode: true }
  });

  try {
    const questionPack = await server.ssrLoadModule("/src/features/question-packs/questionPack.ts");
    const questionPackReview = await server.ssrLoadModule(
      "/src/features/question-packs/questionPackReview.ts"
    );
    const communityCatalog = await server.ssrLoadModule(
      "/src/features/question-packs/communityPackCatalog.ts"
    );
    const validation = await server.ssrLoadModule(
      "/src/features/question-packs/questionPackValidation.ts"
    );

    return {
      close: () => server.close(),
      tools: {
        compareCommunityPackSemVer: communityCatalog.compareCommunityPackSemVer,
        getQuestionPackDifficultyCounts: questionPack.getQuestionPackDifficultyCounts,
        parseCommunityPackReviewMetadata: communityCatalog.parseCommunityPackReviewMetadata,
        questionPackMaxFileBytes: validation.questionPackMaxFileBytes,
        reviewQuestionPack: questionPackReview.reviewQuestionPack,
        validateQuestionPackPayload: questionPack.validateQuestionPackPayload
      }
    };
  } catch (error) {
    await server.close();
    throw error;
  }
}

export async function generateCommunityPackCatalog({ repositoryRoot = projectRoot, tools } = {}) {
  const loaded = tools === undefined ? await createCanonicalPackTools() : undefined;

  try {
    const activeTools = tools ?? loaded.tools;
    assertCanonicalTools(activeTools);
    const compareSemVer = activeTools.compareCommunityPackSemVer;
    const appVersion = await readAppVersion(repositoryRoot, compareSemVer);
    const candidates = await findPackCandidates(repositoryRoot, compareSemVer);
    const identities = new Set();
    const records = [];

    for (const candidate of candidates) {
      records.push(
        await validateCandidate({
          appVersion,
          candidate,
          identities,
          repositoryRoot,
          tools: activeTools
        })
      );
    }

    records.sort((left, right) => compareCatalogRecord(left, right, compareSemVer));
    validateLineages(records, compareSemVer);

    const entries = [];
    const tombstones = [];
    for (const record of records) {
      const withdrawn = lastEvent(record.metadata.events, "withdrawn");
      if (withdrawn !== undefined) {
        tombstones.push({
          id: record.metadata.id,
          version: record.metadata.version,
          status: "withdrawn",
          date: withdrawn.date,
          reason: withdrawn.reason,
          reference: withdrawn.reference,
          ...(withdrawn.replacementId === undefined
            ? {}
            : {
                replacementId: withdrawn.replacementId,
                replacementVersion: withdrawn.replacementVersion
              })
        });
        continue;
      }

      const deprecated = lastEvent(record.metadata.events, "deprecated");
      entries.push({
        id: record.metadata.id,
        version: record.metadata.version,
        title: record.metadata.title,
        summary: record.metadata.summary,
        kind: record.metadata.kind,
        topics: orderValues(record.metadata.topics),
        difficulties: orderDifficulties(record.metadata.difficulties),
        language: record.metadata.language,
        publisher: record.metadata.publisher,
        contentLicenseId: record.metadata.contentLicenseId,
        reviewDate: record.metadata.review.reviewDate,
        minimumAppVersion: record.metadata.compatibility.minimumAppVersion,
        packSchemaVersion: record.metadata.compatibility.packSchemaVersion,
        file: record.metadata.file.slice("public".length),
        bytes: record.bytes,
        sha256: record.sha256,
        repositoryReviewed: true,
        deprecated: deprecated !== undefined,
        ...(deprecated === undefined
          ? {}
          : {
              deprecation: {
                date: deprecated.date,
                reason: deprecated.reason,
                reference: deprecated.reference,
                ...(deprecated.replacementId === undefined
                  ? {}
                  : {
                      replacementId: deprecated.replacementId,
                      replacementVersion: deprecated.replacementVersion
                    })
              }
            })
      });
    }

    const catalog = { catalogSchemaVersion: 1, entries, tombstones };
    return { catalog, serialized: `${JSON.stringify(catalog, null, 2)}\n` };
  } finally {
    await loaded?.close();
  }
}

export async function syncCommunityPackCatalog({
  checkOnly = false,
  repositoryRoot = projectRoot,
  tools
} = {}) {
  const { catalog, serialized } = await generateCommunityPackCatalog({ repositoryRoot, tools });
  const outputPath = join(repositoryRoot, ...manifestFile.split("/"));
  let current;

  try {
    current = await readFile(outputPath, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  if (current === serialized) return { catalog, changed: false, outputPath };
  if (checkOnly) {
    throw new Error(
      `${manifestFile} is out of date. Run node scripts/sync-community-pack-catalog.mjs.`
    );
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized, "utf8");
  return { catalog, changed: true, outputPath };
}

async function validateCandidate({
  appVersion,
  candidate,
  identities,
  repositoryRoot,
  tools
}) {
  const packPath = join(repositoryRoot, ...candidate.packFile.split("/"));
  const reviewPath = join(repositoryRoot, ...candidate.reviewFile.split("/"));
  const packBytes = await readFile(packPath);
  if (packBytes.byteLength > tools.questionPackMaxFileBytes) {
    throw new Error(
      `${candidate.packFile} exceeds the ${tools.questionPackMaxFileBytes}-byte question-pack limit.`
    );
  }

  const packPayload = parseUtf8Json(packBytes, candidate.packFile);
  const validation = tools.validateQuestionPackPayload(packPayload, fixedImportedAt);
  if (validation.status !== "valid") {
    throw new Error(`${candidate.packFile} is invalid:\n- ${validation.errors.join("\n- ")}`);
  }

  const identity = `${validation.pack.id}\u0000${validation.pack.packVersion}`;
  if (identities.has(identity)) {
    throw new Error(
      `Duplicate catalog identity ${JSON.stringify(validation.pack.id)} version ${JSON.stringify(validation.pack.packVersion)}.`
    );
  }
  identities.add(identity);

  tools.reviewQuestionPack(validation.pack);
  const reviewPayload = parseUtf8Json(await readFile(reviewPath), candidate.reviewFile);
  const review = tools.parseCommunityPackReviewMetadata(reviewPayload, {
    directoryId: candidate.id,
    directoryVersion: candidate.version,
    packFile: candidate.packFile,
    pack: validation.pack
  });
  if (review.status !== "valid") {
    throw new Error(`${candidate.reviewFile} is invalid:\n- ${review.errors.join("\n- ")}`);
  }

  const sha256 = createHash("sha256").update(packBytes).digest("hex");
  if (review.metadata.sha256 !== sha256) {
    throw new Error(
      `${candidate.reviewFile} checksum drift: expected ${review.metadata.sha256}, computed ${sha256}.`
    );
  }
  if (tools.compareCommunityPackSemVer(review.metadata.compatibility.minimumAppVersion, appVersion) > 0) {
    throw new Error(
      `${candidate.reviewFile} requires Open Prep ${review.metadata.compatibility.minimumAppVersion}, but package.json is ${appVersion}.`
    );
  }

  validateDeclaredCoverage(validation.pack, review.metadata, tools);
  return { bytes: packBytes.byteLength, metadata: review.metadata, sha256 };
}

async function findPackCandidates(repositoryRoot, compareSemVer) {
  const catalogRoot = join(repositoryRoot, ...sourceDirectory.split("/"));
  const rootEntries = await readDirectory(catalogRoot, true);
  const candidates = [];

  for (const idEntry of sortDirectoryEntries(rootEntries)) {
    if (idEntry.name === "catalog.v1.json" && idEntry.isFile()) continue;
    assertDirectory(idEntry, `${sourceDirectory}/${idEntry.name}`);
    if (!safeIdPattern.test(idEntry.name)) {
      throw new Error(`${sourceDirectory}/${idEntry.name} uses an unsafe catalog ID path.`);
    }

    const idPath = join(catalogRoot, idEntry.name);
    for (const versionEntry of sortDirectoryEntries(await readDirectory(idPath))) {
      assertDirectory(versionEntry, `${sourceDirectory}/${idEntry.name}/${versionEntry.name}`);
      assertSemVer(
        versionEntry.name,
        `${sourceDirectory}/${idEntry.name}/${versionEntry.name}`,
        compareSemVer
      );
      const versionPath = join(idPath, versionEntry.name);
      const files = sortDirectoryEntries(await readDirectory(versionPath));
      const expected = new Set([packFileName, reviewFileName]);

      for (const file of files) {
        const displayPath = `${sourceDirectory}/${idEntry.name}/${versionEntry.name}/${file.name}`;
        if (!expected.delete(file.name) || !file.isFile()) {
          throw new Error(`${displayPath} is not an allowed catalog source file.`);
        }
      }
      if (expected.size > 0) {
        throw new Error(
          `${sourceDirectory}/${idEntry.name}/${versionEntry.name} is missing ${[...expected].sort(compareText).join(" and ")}.`
        );
      }

      candidates.push({
        id: idEntry.name,
        version: versionEntry.name,
        packFile: posix.join(
          sourceDirectory,
          idEntry.name,
          versionEntry.name,
          packFileName
        ),
        reviewFile: posix.join(
          sourceDirectory,
          idEntry.name,
          versionEntry.name,
          reviewFileName
        )
      });
    }
  }

  return candidates;
}

function validateDeclaredCoverage(pack, metadata, tools) {
  const topics = deriveTopics(pack);
  if (!sameValues(topics, metadata.topics)) {
    throw new Error(
      `${metadata.file} topics must match validated content: ${orderValues(topics).join(", ")}.`
    );
  }

  const counts = tools.getQuestionPackDifficultyCounts(pack);
  const difficulties = difficultyOrder.filter((difficulty) => counts[difficulty] > 0);
  if (difficulties.length > 0 && !sameValues(difficulties, metadata.difficulties)) {
    throw new Error(
      `${metadata.file} difficulties must match validated content: ${difficulties.join(", ")}.`
    );
  }
}

function deriveTopics(pack) {
  if (pack.kind === "fixed_numeric") return pack.questions.map(({ category }) => category);
  if (pack.kind === "generated_template") return pack.templates.map(({ category }) => category);
  if (pack.kind === "exhibit") return ["exhibit_math"];
  if (pack.kind === "market_sizing") return ["market_sizing"];
  if (pack.kind === "benchmark") {
    return pack.benchmarks.flatMap(({ questions }) => questions.map(({ category }) => category));
  }

  return [
    ...(pack.brainstormingPrompts === undefined ? [] : ["brainstorming"]),
    ...(pack.fitPrompts === undefined ? [] : ["fit"]),
    ...(pack.fullCases === undefined ? [] : ["full_case"]),
    ...(pack.lessons === undefined ? [] : ["lessons"]),
    ...(pack.questioningPrompts === undefined ? [] : ["questioning"]),
    ...(pack.structuringPrompts === undefined ? [] : ["structuring"]),
    ...(pack.synthesisPrompts === undefined ? [] : ["synthesis"])
  ];
}

function validateLineages(records, compareSemVer) {
  const lastById = new Map();
  const publisherById = new Map();

  for (const record of records) {
    const { id, version } = record.metadata;
    const previousVersion = lastById.get(id);
    if (previousVersion !== undefined && compareSemVer(previousVersion, version) >= 0) {
      throw new Error(
        `Catalog lineage ${JSON.stringify(id)} must use strictly increasing SemVer precedence; ${previousVersion} conflicts with ${version}.`
      );
    }
    lastById.set(id, version);

    const previousPublisher = publisherById.get(id);
    if (previousPublisher !== undefined && previousPublisher !== record.metadata.publisher.id) {
      throw new Error(
        `Catalog lineage ${JSON.stringify(id)} changes publisher ID from ${JSON.stringify(previousPublisher)} to ${JSON.stringify(record.metadata.publisher.id)}.`
      );
    }
    publisherById.set(id, record.metadata.publisher.id);
  }
}

async function readAppVersion(repositoryRoot, compareSemVer) {
  const packagePath = join(repositoryRoot, "package.json");
  const payload = parseUtf8Json(await readFile(packagePath), "package.json");
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error("package.json must contain an object.");
  }
  assertSemVer(payload.version, "package.json version", compareSemVer);
  return payload.version;
}

function parseUtf8Json(bytes, displayPath) {
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${displayPath} must be valid UTF-8.`);
  }

  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${displayPath} must contain valid JSON: ${error.message}`);
  }
}

async function readDirectory(path, missingIsEmpty = false) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (missingIsEmpty && error?.code === "ENOENT") return [];
    throw error;
  }
}

function assertDirectory(entry, displayPath) {
  if (!entry.isDirectory() || entry.isSymbolicLink()) {
    throw new Error(`${displayPath} must be a real directory inside the catalog source root.`);
  }
}

function assertCanonicalTools(tools) {
  for (const name of [
    "compareCommunityPackSemVer",
    "getQuestionPackDifficultyCounts",
    "parseCommunityPackReviewMetadata",
    "reviewQuestionPack",
    "validateQuestionPackPayload"
  ]) {
    if (typeof tools?.[name] !== "function") throw new TypeError(`Missing canonical pack tool ${name}.`);
  }
  if (!Number.isSafeInteger(tools.questionPackMaxFileBytes) || tools.questionPackMaxFileBytes < 1) {
    throw new TypeError("Missing canonical question-pack byte limit.");
  }
}

function assertSemVer(value, label, compareSemVer) {
  if (typeof value !== "string") throw new Error(`${label} must be a valid SemVer value.`);
  try {
    compareSemVer(value, value);
  } catch {
    throw new Error(`${label} must be a valid SemVer value.`);
  }
}

function compareCatalogRecord(left, right, compareSemVer) {
  return (
    compareText(left.metadata.id, right.metadata.id) ||
    compareSemVer(left.metadata.version, right.metadata.version) ||
    compareText(left.metadata.version, right.metadata.version)
  );
}

function compareText(left, right) {
  return left === right ? 0 : left < right ? -1 : 1;
}

function sortDirectoryEntries(entries) {
  return [...entries].sort((left, right) => compareText(left.name, right.name));
}

function orderValues(values) {
  return [...new Set(values)].sort(compareText);
}

function orderDifficulties(values) {
  const unique = new Set(values);
  return difficultyOrder.filter((difficulty) => unique.has(difficulty));
}

function sameValues(left, right) {
  const orderedLeft = orderValues(left);
  const orderedRight = orderValues(right);
  return (
    orderedLeft.length === orderedRight.length &&
    orderedLeft.every((value, index) => value === orderedRight[index])
  );
}

function lastEvent(events, type) {
  return [...events].reverse().find((event) => event.type === type);
}

async function runCli() {
  const supportedArguments = new Set(["--check"]);
  const unknown = process.argv.slice(2).filter((argument) => !supportedArguments.has(argument));
  if (unknown.length > 0) throw new Error(`Unknown argument: ${unknown.join(", ")}`);

  const result = await syncCommunityPackCatalog({ checkOnly: process.argv.includes("--check") });
  console.log(
    process.argv.includes("--check")
      ? `${manifestFile} is current.`
      : result.changed
        ? `Updated ${manifestFile}.`
        : `${manifestFile} is already current.`
  );
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
