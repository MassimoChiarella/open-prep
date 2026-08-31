import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { locales } from "@/features/i18n/i18n";
import { appMessages } from "@/features/i18n/messages";
import { experienceQualityDynamicKeys } from "@/features/i18n/messages/experienceQuality";

const sourceRoot = path.resolve(process.cwd(), "src");
const translatedLocales = locales.filter((locale) => locale !== "en");
const approvedStaticUiFallbacks = new Set<string>();
const approvedAuthoredContentBoundary = [
  "bundled practice questions",
  "case materials",
  "imported question packs"
] as const;
const coverageDisclosure =
  "Menus, controls, and guidance use the selected language. Bundled practice questions, case materials, and imported packs may remain in their source language.";
const auditedUiFiles = [
  "app/content-packs/downloads/page.tsx",
  "features/offline/NotFoundView.tsx",
  "features/settings/LocalSettingsView.tsx",
  "features/question-packs/ContentPackDownloadsView.tsx",
  "features/question-packs/QuestionPackBuilder.tsx",
  "features/question-packs/QuestionPackManager.tsx",
  "features/exhibits/ExhibitChartRenderer.tsx",
  "features/exhibits/ExhibitTableRenderer.tsx"
] as const;
const approvedRawUiText = new Map([
  ["features/question-packs/QuestionPackManager.tsx:v", "Technical version prefix adjacent to a localized pack label."]
]);

describe("application translation catalog", () => {
  const literalKeys = collectLiteralTranslationKeys(sourceRoot);

  it("covers every literal t() key in every translated locale", () => {
    expect(literalKeys.size).toBeGreaterThanOrEqual(750);
    const missing = Object.fromEntries(
      translatedLocales.map((locale) => [
        locale,
        [...literalKeys].filter((key) => appMessages[locale][key] === undefined && !approvedStaticUiFallbacks.has(key))
      ])
    );
    expect(missing).toEqual(Object.fromEntries(translatedLocales.map((locale) => [locale, []])));
    expect(appMessages.fr["Case Practice"]).not.toBe("Case Practice");
  });

  it("preserves interpolation placeholders throughout every locale catalog", () => {
    for (const locale of translatedLocales) {
      for (const [key, message] of Object.entries(appMessages[locale])) {
        expect(placeholders(message), `${locale}: ${key}`).toEqual(placeholders(key));
      }
    }
  });

  it("covers registered dynamic UI keys that a literal t() scan cannot discover", () => {
    const missing = Object.fromEntries(
      translatedLocales.map((locale) => [
        locale,
        missingCatalogKeys(appMessages[locale], experienceQualityDynamicKeys)
      ])
    );

    expect(missing).toEqual(Object.fromEntries(translatedLocales.map((locale) => [locale, []])));
  });

  it("detects a missing registered dynamic option fixture", () => {
    expect(missingCatalogKeys(appMessages.de, ["Exact", "Uncataloged dynamic option"])).toEqual([
      "Uncataloged dynamic option"
    ]);
  });

  it("rejects raw accessible labels and user-visible JSX in the audited product surfaces", () => {
    const findings = auditedUiFiles.flatMap((relativePath) => {
      const location = path.join(sourceRoot, relativePath);
      return collectRawUiStrings(location).map((value) => `${relativePath}:${value}`);
    }).filter((finding) => !approvedRawUiText.has(finding));

    expect(findings).toEqual([]);
    expect([...approvedRawUiText]).toEqual([
      ["features/question-packs/QuestionPackManager.tsx:v", "Technical version prefix adjacent to a localized pack label."]
    ]);
  });

  it("detects raw JSX and ARIA fixtures without scanning unrelated authored content", () => {
    const source = ts.createSourceFile(
      "fixture.tsx",
      '<><button aria-label="Raw action">Open pack</button><p>{t("Cataloged")}</p></>',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    expect(collectRawUiStringsFromSource(source)).toEqual(["Raw action", "Open pack"]);
  });

  it("keeps static UI fallbacks empty and documents the source-language content boundary", () => {
    expect([...approvedStaticUiFallbacks]).toEqual([]);
    expect(approvedAuthoredContentBoundary).toEqual([
      "bundled practice questions",
      "case materials",
      "imported question packs"
    ]);

    for (const locale of translatedLocales) {
      expect(appMessages[locale]["Language coverage"], `${locale}: disclosure heading`).toBeTruthy();
      expect(appMessages[locale][coverageDisclosure], `${locale}: disclosure copy`).toBeTruthy();
    }
  });
});

function collectLiteralTranslationKeys(directory: string): Set<string> {
  const keys = new Set<string>();

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "tests") {
        for (const key of collectLiteralTranslationKeys(location)) keys.add(key);
      }
      continue;
    }

    if (!/\.tsx?$/.test(entry.name)) continue;
    const source = ts.createSourceFile(location, readFileSync(location, "utf8"), ts.ScriptTarget.Latest, true);
    walk(source);

    function walk(node: ts.Node): void {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "t" &&
        node.arguments.length > 0 &&
        (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))
      ) {
        keys.add(node.arguments[0].text);
      }
      ts.forEachChild(node, walk);
    }
  }

  return keys;
}

function placeholders(value: string): string[] {
  return Array.from(value.matchAll(/\{\w+\}/g), (match) => match[0]).sort();
}

function missingCatalogKeys(catalog: Record<string, string>, keys: readonly string[]): string[] {
  return keys.filter((key) => catalog[key] === undefined);
}

function collectRawUiStrings(location: string): string[] {
  return collectRawUiStringsFromSource(
    ts.createSourceFile(location, readFileSync(location, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  );
}

function collectRawUiStringsFromSource(source: ts.SourceFile): string[] {
  const findings: string[] = [];

  walk(source);
  return findings;

  function walk(node: ts.Node): void {
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && node.name.text === "aria-label") {
      const initializer = node.initializer;
      if (initializer !== undefined && ts.isStringLiteral(initializer)) findings.push(initializer.text.trim());
      if (
        initializer !== undefined &&
        ts.isJsxExpression(initializer) &&
        initializer.expression !== undefined &&
        ts.isNoSubstitutionTemplateLiteral(initializer.expression)
      ) {
        findings.push(initializer.expression.text.trim());
      }
    }

    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, " ").trim();
      if (/\p{L}/u.test(text)) findings.push(text);
    }

    ts.forEachChild(node, walk);
  }
}
