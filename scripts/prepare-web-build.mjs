import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  removeStaticOutput,
  validateReleaseOutput,
  writeReleaseMarker
} from "./release-contract.mts";

const [command, ...rawArguments] = process.argv.slice(2);
const { flags, values } = parseArguments(rawArguments);
const outputDirectory = path.resolve(values.get("output") ?? "out");

if (command === "clean") {
  rejectOptions(flags, values, ["output"]);
  await removeStaticOutput(outputDirectory);
  console.log(`Removed generated static output: ${path.relative(process.cwd(), outputDirectory) || "."}`);
} else if (command === "finalize") {
  rejectOptions(flags, values, ["cache-id", "commit", "output", "ref", "worker-policy-sha256"], ["clean", "dirty"]);
  if (flags.has("clean") === flags.has("dirty")) {
    throw new Error("Finalize requires exactly one of --clean or --dirty.");
  }
  const packageVersion = await readPackageVersion();
  const marker = await writeReleaseMarker(outputDirectory, {
    version: packageVersion,
    commit: requiredValue(values, "commit"),
    sourceRef: requiredValue(values, "ref"),
    clean: flags.has("clean"),
    workerPolicySha256: requiredValue(values, "worker-policy-sha256"),
    cacheId: requiredValue(values, "cache-id")
  });
  console.log(`Finalized ${marker.product} ${marker.version} (${marker.artifact.files} files).`);
} else if (command === "verify") {
  rejectOptions(flags, values, ["commit", "output", "ref"], ["require-clean"]);
  const packageVersion = await readPackageVersion();
  await validateReleaseOutput(outputDirectory, {
    version: packageVersion,
    commit: values.get("commit"),
    sourceRef: values.get("ref"),
    clean: flags.has("require-clean") ? true : undefined
  });
  console.log(`Verified Open Prep ${packageVersion} static output.`);
} else {
  throw new Error(
    "Usage: node scripts/prepare-web-build.mjs <clean|finalize|verify> [--output DIR] [release options]"
  );
}

async function readPackageVersion() {
  return JSON.parse(await readFile(path.resolve("package.json"), "utf8")).version;
}

function parseArguments(argumentsList) {
  const flags = new Set();
  const values = new Map();

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const name = argument.slice(2);
    const next = argumentsList[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      values.set(name, next);
      index += 1;
    } else {
      flags.add(name);
    }
  }

  return { flags, values };
}

function requiredValue(values, name) {
  const value = values.get(name);
  if (value === undefined) throw new Error(`Missing required option: --${name}`);
  return value;
}

function rejectOptions(flags, values, allowedValues, allowedFlags = []) {
  const unknown = [
    ...[...values.keys()].filter((name) => !allowedValues.includes(name)),
    ...[...flags].filter((name) => !allowedFlags.includes(name))
  ];
  if (unknown.length > 0) throw new Error(`Unknown option: --${unknown[0]}`);
}
