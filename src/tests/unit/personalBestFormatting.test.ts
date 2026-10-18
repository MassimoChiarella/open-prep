import { describe, expect, it } from "vitest";

import { categoryOptions, skillTagOptions } from "@/features/drills/drillSettingsOptions";
import { locales, translate, type Locale, type PartialMessageCatalog, type TranslationVariables } from "@/features/i18n/i18n";
import ar from "@/features/i18n/locales/ar";
import de from "@/features/i18n/locales/de";
import es from "@/features/i18n/locales/es";
import fr from "@/features/i18n/locales/fr";
import hi from "@/features/i18n/locales/hi";
import ja from "@/features/i18n/locales/ja";
import pt from "@/features/i18n/locales/pt";
import zhHans from "@/features/i18n/locales/zh-Hans";
import zhHant from "@/features/i18n/locales/zh-Hant";
import { formatPersonalBestLabel } from "@/features/progress/personalBestFormatting";
import { formatLabel } from "@/lib/format";

const catalog: PartialMessageCatalog = { ar, de, es, fr, hi, ja, pt, "zh-Hans": zhHans, "zh-Hant": zhHant };
const scopeOptions = [...categoryOptions, ...skillTagOptions,
  { value: "market_sizing", label: "Market Sizing" }, { value: "exhibit_math", label: "Exhibits" },
  { value: "k_m_b_conversion", label: "K/M/B conversion" }];

function context(locale: Locale) {
  return { locale, t: (key: string, variables?: TranslationVariables) => translate(catalog, locale, key, variables) };
}

describe("personal-best display labels", () => {
  it.each(locales.filter((locale) => locale !== "en"))("covers every generated scope and metric in %s", (locale) => {
    const i18n = context(locale);
    for (const option of scopeOptions) {
      for (const [suffix, template] of [["accuracy", "{skill} accuracy"], ["fastest correct pace", "{skill} fastest correct pace"]]) {
        const canonical = `${formatLabel(option.value)} ${suffix}`;
        expect(catalog[locale]?.[option.label], `${locale}: ${option.label}`).toBeDefined();
        const translated = formatPersonalBestLabel(canonical, i18n);
        expect(translated).toBe(i18n.t(template, { skill: i18n.t(option.label) }));
        expect(translated).not.toBe(canonical);
      }
    }
    for (const label of ["Best benchmark score", "Longest practice streak"]) {
      expect(formatPersonalBestLabel(label, i18n)).toBe(i18n.t(label));
      expect(formatPersonalBestLabel(label, i18n)).not.toBe(label);
    }
  });

  it("preserves canonical English labels and unfamiliar imported labels", () => {
    const labels = ["Fractions Decimals Ratios accuracy", "Addition fastest correct pace", "Longest practice streak", "Best benchmark score"];
    for (const label of labels) expect(formatPersonalBestLabel(label, context("en"))).toBe(label);
    for (const locale of locales) {
      for (const label of ["Custom badge", "Custom accuracy", "Arithmetic unfamiliar metric"]) {
        expect(formatPersonalBestLabel(label, context(locale))).toBe(label);
      }
    }
  });
});
