import { categoryOptions, skillTagOptions } from "@/features/drills/drillSettingsOptions";
import type { useI18n } from "@/features/i18n/I18nProvider";
import { formatLabel } from "@/lib/format";

type PersonalBestI18n = Pick<ReturnType<typeof useI18n>, "locale" | "t">;

const scopeTranslationKeys = new Map([
  ...categoryOptions,
  ...skillTagOptions,
  { value: "market_sizing", label: "Market Sizing" },
  { value: "exhibit_math", label: "Exhibits" },
  { value: "k_m_b_conversion", label: "K/M/B conversion" }
].map(({ value, label }) => [formatLabel(value), label]));

export function formatPersonalBestScopeLabel(label: string, { locale, t }: PersonalBestI18n): string {
  return locale === "en" ? label : t(scopeTranslationKeys.get(label) ?? label);
}

/** Translate engine-generated labels only at display time; retain unfamiliar labels verbatim. */
export function formatPersonalBestLabel(label: string, i18n: PersonalBestI18n): string {
  if (i18n.locale === "en") return label;
  const { t } = i18n;
  if (label === "Best benchmark score") return t("Best benchmark score");
  if (label === "Longest practice streak") return t("Longest practice streak");
  const match = /^(.*) (accuracy|fastest correct pace)$/.exec(label);
  if (match === null || !scopeTranslationKeys.has(match[1])) return label;
  const skill = formatPersonalBestScopeLabel(match[1], i18n);
  return match[2] === "accuracy" ? t("{skill} accuracy", { skill }) : t("{skill} fastest correct pace", { skill });
}
