import { buildDrillSettingsQuery } from "@/features/drills/drillSettingsOptions";
import { createDrillSettings } from "@/features/drills/drillSettings";
import type { Formula, SkillCategory } from "@/lib/domain";

export interface FormulaFilterState {
  category: SkillCategory | "all";
  searchTerm: string;
}

const categoryLabels: Record<SkillCategory, string> = {
  arithmetic: "Arithmetic",
  percentages: "Percentages",
  fractions_decimals_ratios: "Fractions and decimals",
  growth_compounding: "Growth and compounding",
  weighted_averages: "Weighted averages",
  business_math: "Business math",
  case_math: "Case math",
  market_sizing: "Market sizing",
  exhibit_math: "Exhibit math"
};

export function filterFormulas(formulas: readonly Formula[], filters: FormulaFilterState): Formula[] {
  const normalizedSearch = normalize(filters.searchTerm);

  return formulas.filter((formula) => {
    const categoryMatches = filters.category === "all" || formula.category === filters.category;
    const searchMatches =
      normalizedSearch.length === 0 ||
      [
        formula.name,
        formula.formulaText,
        formula.explanation,
        formula.example,
        categoryLabels[formula.category],
        ...formula.tags
      ].some((value) => normalize(value).includes(normalizedSearch));

    return categoryMatches && searchMatches;
  });
}

export function getFormulaCategoryOptions(formulas: readonly Formula[]): { label: string; value: SkillCategory }[] {
  const categories = Array.from(new Set(formulas.map((formula) => formula.category)));

  return categories
    .sort((first, second) => categoryLabels[first].localeCompare(categoryLabels[second]))
    .map((category) => ({
      label: categoryLabels[category],
      value: category
    }));
}

export function getFormulaCategoryLabel(category: SkillCategory): string {
  return categoryLabels[category];
}

export function buildFormulaDrillHref(formula: Formula): string {
  const formulaTag = formula.tags.find((tag) => tag === formula.id);
  const settings = createDrillSettings({
    categories: [formula.category],
    difficulty: "beginner",
    feedbackMode: "instant",
    questionCount: 5,
    tags: formulaTag === undefined ? (formula.tags.length > 0 ? formula.tags : undefined) : [formulaTag]
  });

  return `/drills/session?${buildDrillSettingsQuery(settings)}`;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replaceAll("_", " ");
}
