import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const staleVisibleNames = [
  "Consulting Mental Math Practice", // identity-scan-pattern
  "Consulting Math Practice", // identity-scan-pattern
  "Mental Math Practice" // identity-scan-pattern
];

const allowedDetectionFixtures = [
  {
    file: "scripts/check-product-identity.mjs",
    marker: "identity-scan-pattern",
    reason: "The scanner must define the names it rejects."
  },
  {
    file: "src/tests/unit/productIdentityScan.test.ts",
    marker: "identity-scan-fixture",
    reason: "The focused test needs one negative fixture."
  }
];

export const legacyCompatibilityAllowlist = Object.freeze([
  {
    value: "consulting_math_drill_tool",
    contexts: [
      "src/lib/storage/appStorageTypes.ts#appDatabaseName",
      "src/tests/e2e/release-journeys.spec.ts#legacy database fixtures",
      "src/tests/unit/localProgressExport.test.ts#legacy export fixture",
      "src/tests/unit/storage.test.ts#database compatibility assertion"
    ]
  },
  {
    value: "consulting_math_theme_preference",
    contexts: [
      "src/features/theme/theme.ts#themePreferenceStorageKey",
      "src/tests/e2e/visual-regression.spec.ts#persisted-preference fixture"
    ]
  },
  {
    value: "consulting_math_locale_preference",
    contexts: [
      "src/features/i18n/i18n.ts#localePreferenceStorageKey",
      "src/tests/e2e/visual-regression.spec.ts#persisted-preference fixture"
    ]
  },
  {
    value: "math-drill-question-pack",
    contexts: [
      "src/features/question-packs/questionPack.ts#questionPackFormat",
      "src/lib/storage/appStorageTypes.ts#question-pack record formats",
      "public/question-pack-v2.schema.json#properties.format.const",
      "public/question-pack-v3.schema.json#properties.format.const"
    ]
  },
  {
    value: ".mathdrill.json",
    contexts: [
      "src/features/question-packs/QuestionPackManager.tsx#import and export extension",
      "public/question-pack-*.mathdrill.json#stable public asset paths"
    ]
  },
  {
    value: "consulting-math-drill:question-pack-write",
    contexts: ["src/features/question-packs/questionPack.ts#questionPackWriteLockName"]
  },
  {
    value: "consulting-math-service-worker-status",
    contexts: ["src/features/offline/OfflineStatusIndicator.tsx#serviceWorkerStatusEventName"]
  },
  {
    value: "math-drill-offline-",
    contexts: ["public/sw.js#legacy cache discovery and cleanup prefix"]
  },
  {
    value: "/math-drill-ai-pack-*",
    contexts: [
      "public/math-drill-ai-pack-*.md#stable public asset paths",
      "src/app/content-packs/downloads/page.tsx#legacy download links",
      "scripts/sync-question-pack-authoring-kit.mjs#generated asset paths"
    ]
  },
  {
    value: "consulting-math-drill-tool",
    contexts: ["package.json#private npm package slug", "package-lock.json#lockfile package slug"]
  }
]);

const excludedPrefixes = [
  ".git/",
  ".next/",
  "build/",
  "coverage/",
  "dist/",
  "node_modules/",
  "out/",
  "playwright-report/",
  "test-results/"
];
const textExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mdx",
  ".mjs",
  ".scss",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml"
]);
const extensionlessTextFiles = new Set(["LICENSE"]);
const staleNamePattern = new RegExp(
  staleVisibleNames
    .toSorted((left, right) => right.length - left.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
  "giu"
);

const cliArguments = process.argv.slice(2);

if (cliArguments.includes("--list-compatibility")) {
  console.log(JSON.stringify(legacyCompatibilityAllowlist, null, 2));
} else {
  const explicitFiles = cliArguments.filter((argument) => !argument.startsWith("--"));
  const files = explicitFiles.length > 0 ? explicitFiles : repositoryTextFiles();
  const findings = await scanFiles(files);

  if (findings.length === 0) {
    console.log(`Product identity scan passed (${files.length} text files checked).`);
  } else {
    console.error("Unapproved old user-facing product names:");
    for (const finding of findings) {
      console.error(
        `${finding.file}:${finding.line}:${finding.column} ${JSON.stringify(finding.name)}; use "Open Prep" or a consulting-interview descriptor.`
      );
    }
    console.error(`Product identity scan failed with ${findings.length} finding${findings.length === 1 ? "" : "s"}.`);
    process.exitCode = 1;
  }
}

function repositoryTextFiles() {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      cwd: projectRoot,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    }
  );

  return output
    .split("\0")
    .filter(Boolean)
    .map(normalizePath)
    .filter(isTextSurface)
    .toSorted();
}

async function scanFiles(files) {
  const findings = [];

  for (const suppliedPath of files) {
    const absolutePath = path.isAbsolute(suppliedPath)
      ? suppliedPath
      : path.join(projectRoot, suppliedPath);
    const displayPath = normalizePath(path.relative(projectRoot, absolutePath));
    let content;

    try {
      content = await readFile(absolutePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") {
        continue;
      }
      throw error;
    }

    for (const match of content.matchAll(staleNamePattern)) {
      const location = lineLocation(content, match.index ?? 0);
      const lineText = content.slice(location.lineStart, location.lineEnd);
      if (isAllowedDetectionFixture(displayPath, lineText)) {
        continue;
      }

      findings.push({
        column: location.column,
        file: displayPath,
        line: location.line,
        name: match[0]
      });
    }
  }

  return findings.toSorted(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.column - right.column ||
      left.name.localeCompare(right.name)
  );
}

function isTextSurface(file) {
  if (excludedPrefixes.some((prefix) => file.startsWith(prefix))) {
    return false;
  }

  return textExtensions.has(path.extname(file).toLowerCase()) || extensionlessTextFiles.has(path.basename(file));
}

function isAllowedDetectionFixture(file, lineText) {
  return allowedDetectionFixtures.some(
    (entry) => entry.file === file && lineText.includes(entry.marker)
  );
}

function lineLocation(content, index) {
  const before = content.slice(0, index);
  const lineStart = before.lastIndexOf("\n") + 1;
  const nextNewline = content.indexOf("\n", index);

  return {
    column: index - lineStart + 1,
    line: before.split("\n").length,
    lineEnd: nextNewline === -1 ? content.length : nextNewline,
    lineStart
  };
}

function normalizePath(value) {
  return value.replaceAll(path.sep, "/");
}
