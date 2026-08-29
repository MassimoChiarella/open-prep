import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { locales } from "@/features/i18n/i18n";
import { appMessages } from "@/features/i18n/messages";

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
