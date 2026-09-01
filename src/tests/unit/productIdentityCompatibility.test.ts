import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ReactElement } from "react";

import { describe, expect, it } from "vitest";

import ContentPackDownloadsPage, {
  type DownloadViewGroup
} from "@/app/content-packs/downloads/page";
import manifest from "@/app/manifest";
import { metadata } from "@/app/layout";
import { localePreferenceStorageKey } from "@/features/i18n/i18n";
import { serviceWorkerStatusEventName } from "@/features/offline/OfflineStatusIndicator";
import { validateQuestionPackPayload } from "@/features/question-packs/questionPack";
import { localProgressExportAppId } from "@/features/settings/localProgressExport";
import { themePreferenceStorageKey } from "@/features/theme/theme";
import {
  appDatabaseName,
  appDatabaseVersion,
  appStoreIndexNames,
  appStoreNames
} from "@/lib/storage/appStorageTypes";

const projectRoot = process.cwd();
const publicDirectory = path.join(projectRoot, "public");
const legacyQuestionPackFormat = "math-drill-question-pack";

const stablePublicUrls = [
  "/math-drill-ai-pack-authoring-kit.md",
  "/math-drill-ai-pack-authoring-start.md",
  "/math-drill-ai-pack-benchmark-complete.md",
  "/math-drill-ai-pack-benchmark-kit.md",
  "/math-drill-ai-pack-case-practice-complete.md",
  "/math-drill-ai-pack-case-practice-kit.md",
  "/math-drill-ai-pack-exhibit-complete.md",
  "/math-drill-ai-pack-exhibit-kit.md",
  "/math-drill-ai-pack-fixed-numeric-complete.md",
  "/math-drill-ai-pack-fixed-numeric-kit.md",
  "/math-drill-ai-pack-generated-template-complete.md",
  "/math-drill-ai-pack-generated-template-kit.md",
  "/math-drill-ai-pack-market-sizing-complete.md",
  "/math-drill-ai-pack-market-sizing-kit.md",
  "/question-pack-author-guide.md",
  "/question-pack-benchmark-example.mathdrill.json",
  "/question-pack-case-practice-example.mathdrill.json",
  "/question-pack-case-questioning-example.mathdrill.json",
  "/question-pack-chart-example.mathdrill.json",
  "/question-pack-example.mathdrill.json",
  "/question-pack-exhibit-example.mathdrill.json",
  "/question-pack-interview-math-example.mathdrill.json",
  "/question-pack-market-sizing-cookbook.mathdrill.json",
  "/question-pack-market-sizing-example.mathdrill.json",
  "/question-pack-starter.mathdrill.json",
  "/question-pack-template-example.mathdrill.json",
  "/question-pack-v2.schema.json",
  "/question-pack-v3-full-case-example.mathdrill.json",
  "/question-pack-v3.schema.json",
  "/question-pack-visualization-cookbook.mathdrill.json"
] as const;

describe("Open Prep legacy identity compatibility", () => {
  it("preserves the IndexedDB database, version, stores, and indexes", () => {
    expect(appDatabaseName).toBe("consulting_math_drill_tool");
    expect(appDatabaseVersion).toBe(8);
    expect(appStoreNames).toEqual([
      "drill_sessions",
      "responses",
      "benchmark_results",
      "user_settings",
      "market_sizing_attempts",
      "exhibit_attempts",
      "mistake_notebook",
      "retry_schedules",
      "practice_records",
      "question_packs"
    ]);
    expect(appStoreIndexNames).toEqual({
      benchmark_results: "completed_at_id",
      question_packs: "imported_at_id"
    });
  });

  it("preserves local preference keys and the progress-export discriminator", () => {
    expect(themePreferenceStorageKey).toBe("consulting_math_theme_preference");
    expect(localePreferenceStorageKey).toBe("consulting_math_locale_preference");
    expect(localProgressExportAppId).toBe("consulting_math_drill_tool");
  });

  it("preserves the question-pack wire format and filename convention", () => {
    const starter = JSON.parse(
      readFileSync(path.join(publicDirectory, "question-pack-starter.mathdrill.json"), "utf8")
    ) as { format?: unknown };
    const packSource = readSource("src/features/question-packs/questionPack.ts");
    const managerSource = readSource("src/features/question-packs/QuestionPackManager.tsx");

    expect(starter.format).toBe(legacyQuestionPackFormat);
    expect(validateQuestionPackPayload(starter).status).toBe("valid");
    expect(packSource).toContain(`const questionPackFormat = "${legacyQuestionPackFormat}" as const;`);
    expect(managerSource).toContain('accept="application/json,.json,.mathdrill.json"');
    expect(managerSource).toContain("link.download = `${pack.id}.mathdrill.json`;");

    for (const schemaName of ["question-pack-v2.schema.json", "question-pack-v3.schema.json"]) {
      const schema = JSON.parse(readFileSync(path.join(publicDirectory, schemaName), "utf8")) as {
        properties?: { format?: { const?: unknown } };
      };
      expect(schema.properties?.format?.const, schemaName).toBe(legacyQuestionPackFormat);
    }
  });

  it("preserves cross-context event, lock, and legacy cache identifiers", () => {
    const packSource = readSource("src/features/question-packs/questionPack.ts");
    const workerSource = readSource("public/sw.js");

    expect(serviceWorkerStatusEventName).toBe("consulting-math-service-worker-status");
    expect(packSource).toContain(
      'const questionPackWriteLockName = "consulting-math-drill:question-pack-write";'
    );
    expect(packSource).toContain("lockManager.request(questionPackWriteLockName, action)");
    expect(workerSource).toContain('key.startsWith("math-drill-offline-")');
    expect(workerSource.match(/^const CACHE_VERSION = "([^"]+)";/m)?.[1]).toMatch(
      /^math-drill-offline-/
    );
  });

  it("keeps legacy public authoring and example URLs available", () => {
    const downloadsPage = ContentPackDownloadsPage() as ReactElement<{
      groups: readonly DownloadViewGroup[];
      optionalGroups: readonly DownloadViewGroup[];
    }>;
    const downloadUrls = [...downloadsPage.props.groups, ...downloadsPage.props.optionalGroups]
      .flatMap((group) => group.assets.map((asset) => asset.href.split("?", 1)[0]));

    for (const url of stablePublicUrls) {
      expect(existsSync(path.join(publicDirectory, url.slice(1))), url).toBe(true);
      expect(downloadUrls, url).toContain(url);
    }
  });

  it("uses Open Prep for current runtime and install identity", () => {
    expect(metadata.applicationName).toBe("Open Prep");
    expect(manifest()).toMatchObject({ name: "Open Prep", short_name: "Open Prep" });
  });
});

function readSource(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}
