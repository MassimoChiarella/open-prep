import { buildDrillSettingsQuery } from "@/features/drills/drillSettingsOptions";
import { createDrillSettings } from "@/features/drills/drillSettings";
import type { DrillSettings, Formula, SkillCategory, SkillTag } from "@/lib/domain";

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

const relatedDrillOverrides: Partial<Record<string, Pick<DrillSettings, "categories" | "tags">>> = {
  cagr: { categories: ["percentages"], tags: ["percentage_change"] },
  rule_of_72: { categories: ["percentages"], tags: ["percentage_of_number"] }
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
  const relatedDrill = relatedDrillOverrides[formula.id] ?? {
    categories: [formula.category],
    tags: getSupportedFormulaTags(formula.tags)
  };
  const settings = createDrillSettings({
    categories: relatedDrill.categories,
    difficulty: "beginner",
    feedbackMode: "instant",
    questionCount: 5,
    tags: relatedDrill.tags
  });

  return `/drills/session?${buildDrillSettingsQuery(settings)}`;
}

function getSupportedFormulaTags(tags: readonly SkillTag[]): SkillTag[] | undefined {
  const supportedTags = tags.filter((tag) => !["cagr", "compound_growth", "rule_of_72", "simple_growth"].includes(tag));

  return supportedTags.length > 0 ? supportedTags : undefined;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replaceAll("_", " ");
}
