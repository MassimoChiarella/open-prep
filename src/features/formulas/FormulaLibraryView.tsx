"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { badgeClass, buttonClass, uiInputs } from "@/components/uiStyles";
import {
  buildFormulaDrillHref,
  filterFormulas,
  getFormulaCategoryLabel,
  getFormulaCategoryOptions
} from "@/features/formulas/formulaFilters";
import { useI18n } from "@/features/i18n/I18nProvider";
import type { Formula, SkillCategory } from "@/lib/domain";

interface FormulaLibraryViewProps {
  formulas: Formula[];
}

interface FormulaGroup {
  description: string;
  formulas: Formula[];
  id: FormulaGroupId;
  title: string;
}

type FormulaGroupId =
  | "core_business_model"
  | "cost_breakeven"
  | "returns_investment"
  | "percent_growth"
  | "averages_operations";

const formulaGroupOrder: FormulaGroupId[] = [
  "core_business_model",
  "cost_breakeven",
  "returns_investment",
  "percent_growth",
  "averages_operations"
];

const formulaGroups: Record<FormulaGroupId, { description: string; title: string }> = {
  averages_operations: {
    description: "Mix, capacity, and operating efficiency math.",
    title: "Averages And Operations"
  },
  core_business_model: {
    description: "Revenue, profit, margin, and market share formulas.",
    title: "Revenue And Profitability"
  },
  cost_breakeven: {
    description: "Cost structure and volume needed to break even.",
    title: "Cost And Breakeven"
  },
  percent_growth: {
    description: "Percent change, compounding, and growth shortcuts.",
    title: "Percent And Growth"
  },
  returns_investment: {
    description: "Return and payback calculations for investment decisions.",
    title: "Returns And Investment"
  }
};

const formulaGroupById: Record<string, FormulaGroupId> = {
  breakeven_volume: "cost_breakeven",
  cagr: "percent_growth",
  capacity_utilization: "averages_operations",
  contribution_margin: "cost_breakeven",
  margin: "core_business_model",
  market_share: "core_business_model",
  payback_period: "returns_investment",
  percentage_change: "percent_growth",
  profit: "core_business_model",
  revenue: "core_business_model",
  roi: "returns_investment",
  rule_of_72: "percent_growth",
  total_cost: "cost_breakeven",
  weighted_average: "averages_operations"
};

const formulaMathTypeById: Record<string, string> = {
  breakeven_volume: "Algebra setup",
  cagr: "Compound growth",
  capacity_utilization: "Ratio",
  contribution_margin: "Unit economics",
  margin: "Percentage ratio",
  market_share: "Share ratio",
  payback_period: "Rate and time",
  percentage_change: "Percent change",
  profit: "Subtraction",
  revenue: "Multiplication",
  roi: "Return ratio",
  rule_of_72: "Growth shortcut",
  total_cost: "Cost buildup",
  weighted_average: "Weighted average"
};

export function FormulaLibraryView({ formulas }: FormulaLibraryViewProps) {
  const { formatNumber, t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<SkillCategory | "all">("all");
  const categories = useMemo(() => getFormulaCategoryOptions(formulas), [formulas]);
  const filteredFormulas = useMemo(
    () => filterFormulas(formulas, { category, searchTerm }),
    [category, formulas, searchTerm]
  );
  const groupedFormulas = useMemo(() => groupFormulasByTask(filteredFormulas), [filteredFormulas]);
  const hasActiveFilters = searchTerm.trim().length > 0 || category !== "all";
  const resetFilters = () => {
    setSearchTerm("");
    setCategory("all");
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={{ href: "/drills", label: t("Start Formula Drill") }}
        description={t("Find consulting math formulas, examples, and direct links into related practice.")}
        eyebrow={t("Reference")}
        title={t("Formula Library")}
      />

      <section
        className="grid gap-5 border border-ink/15 border-t-2 border-t-coral bg-white p-5 sm:p-6"
        data-testid="formula-filter-panel"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold text-ink">{t("Find a Formula")}</h2>
            <p className="text-sm leading-6 text-ink/65">
              {t("Showing {visible} of {total} local formulas.", { visible: formatNumber(filteredFormulas.length), total: formatNumber(formulas.length) })}
            </p>
          </div>
          {hasActiveFilters ? (
            <button
              className={buttonClass("secondary")}
              onClick={resetFilters}
              type="button"
            >
              {t("Clear Filters")}
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_16rem]">
          <label className="grid gap-2 text-sm font-medium text-ink/80">
            {t("Search formulas")}
            <input
              className={uiInputs.base}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              placeholder={t("Margin, breakeven, growth...")}
              type="search"
              value={searchTerm}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-ink/80">
            {t("Formula category")}
            <select
              className={uiInputs.compact}
              onChange={(event) => setCategory(event.currentTarget.value as SkillCategory | "all")}
              value={category}
            >
              <option value="all">{t("All formulas")}</option>
              {categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2" data-testid="formula-active-filters">
          <span className={filterChipClass(category === "all")}>
            {category === "all" ? t("Category: All formulas") : t("Category: {category}", { category: t(getFormulaCategoryLabel(category)) })}
          </span>
          <span className={filterChipClass(searchTerm.trim().length === 0)}>
            {searchTerm.trim().length === 0 ? t("Search: Any keyword") : t("Search: {search}", { search: searchTerm.trim() })}
          </span>
        </div>
      </section>

      <section className="grid gap-6" data-testid="formula-groups">
        {groupedFormulas.map((group, index) => (
          <section className="grid gap-3" data-testid={`formula-group-${group.id}`} key={group.id}>
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/15 pb-3">
              <div className="grid gap-1 sm:grid-cols-[2rem_minmax(0,1fr)] sm:gap-x-3">
                <span aria-hidden="true" className="font-mono text-xs font-semibold text-coral sm:pt-1.5">
                  {String(index + 2).padStart(2, "0")}
                </span>
                <div className="grid gap-1">
                  <h2 className="text-xl font-semibold text-ink">{t(group.title)}</h2>
                  <p className="text-sm leading-6 text-ink/65">{t(group.description)}</p>
                </div>
              </div>
              <span className="rounded-md bg-paper px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-ink/65">
                {formatNumber(group.formulas.length)} {t(group.formulas.length === 1 ? "formula" : "formulas")}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {group.formulas.map((formula) => (
                <FormulaCard formula={formula} key={formula.id} />
              ))}
            </div>
          </section>
        ))}
      </section>

      {filteredFormulas.length === 0 ? <NoFormulaResults onReset={resetFilters} /> : null}
    </main>
  );
}

function NoFormulaResults({ onReset }: { onReset: () => void }) {
  const { t } = useI18n();
  return (
    <section
      className="grid gap-4 border border-ink/15 border-t-2 border-t-coral bg-white p-5 sm:p-6"
      data-testid="formula-no-results"
    >
      <div className="grid gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-coral">{t("No Results")}</p>
        <h2 className="text-lg font-semibold text-ink">{t("No formulas match the current filters.")}</h2>
        <p className="max-w-2xl text-sm leading-6 text-ink/70">
          {t("Clear the filters to return to all formulas, or start a drill if you already know what you want to practice.")}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-teal px-4 text-sm font-semibold text-white transition hover:bg-ink"
          onClick={onReset}
          type="button"
        >
          {t("Reset Formula Filters")}
        </button>
        <Link
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold text-ink transition hover:border-teal hover:text-teal"
          href="/drills"
        >
          {t("Start Drill")}
        </Link>
      </div>
    </section>
  );
}

function FormulaCard({ formula }: { formula: Formula }) {
  const { t } = useI18n();
  return (
    <article
      className="grid gap-4 border border-ink/15 border-t-2 border-t-teal bg-white p-5 transition-colors hover:border-ink/30 focus-within:border-teal"
      data-testid={`formula-card-${formula.id}`}
    >
      <div className="grid gap-2">
        <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
          <h3 className="min-w-0 break-words text-xl font-semibold text-ink [overflow-wrap:anywhere]">
            {formula.name}
          </h3>
          <div className="flex min-w-0 flex-wrap gap-2 sm:justify-end">
            <span className={badgeClass("success")}>
              {t(getFormulaCategoryLabel(formula.category))}
            </span>
            <span className={badgeClass("neutral")}>
              {t(getFormulaMathType(formula))}
            </span>
          </div>
        </div>
      </div>

      <section className="grid gap-2" aria-label={`${formula.name} ${t("formula")}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Formula")}</p>
        <p className="rounded-md bg-paper px-3 py-2 font-mono text-sm leading-6 text-ink">
          {formula.formulaText}
        </p>
      </section>

      <section className="grid gap-2" aria-label={`${formula.name} ${t("How to use it")}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("How to use it")}</p>
        <p className="text-sm leading-6 text-ink/75">{formula.explanation}</p>
      </section>

      <section className="grid gap-2" aria-label={`${formula.name} ${t("Example")}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Example")}</p>
        <p className="rounded-md border border-saffron/40 bg-saffron/10 px-3 py-2 text-sm leading-6 text-ink/80">
          {formula.example}
        </p>
      </section>

      <div className="flex flex-wrap gap-2" aria-label={`${formula.name} related skills`}>
        {formula.tags.map((tag) => (
          <span className={badgeClass("neutral", "normal-case tracking-normal text-ink/65")} key={tag}>
            {tag.replaceAll("_", " ")}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
        <p className="max-w-sm text-xs leading-5 text-ink/65">
          {t("Practice this formula with a short built-in drill using related question templates.")}
        </p>
        <Link
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-teal px-4 text-sm font-semibold text-white transition hover:bg-ink"
          href={buildFormulaDrillHref(formula)}
        >
          {t("Start Related Drill")}
        </Link>
      </div>
    </article>
  );
}

function groupFormulasByTask(formulas: readonly Formula[]): FormulaGroup[] {
  const grouped = new Map<FormulaGroupId, Formula[]>();

  for (const groupId of formulaGroupOrder) {
    grouped.set(groupId, []);
  }

  for (const formula of formulas) {
    const groupId = formulaGroupById[formula.id] ?? "core_business_model";
    grouped.get(groupId)?.push(formula);
  }

  return formulaGroupOrder.flatMap((groupId) => {
    const groupFormulas = grouped.get(groupId) ?? [];

    if (groupFormulas.length === 0) {
      return [];
    }

    return [
      {
        ...formulaGroups[groupId],
        formulas: groupFormulas,
        id: groupId
      }
    ];
  });
}

function getFormulaMathType(formula: Formula): string {
  return formulaMathTypeById[formula.id] ?? getFormulaCategoryLabel(formula.category);
}

function filterChipClass(isDefault: boolean): string {
  return badgeClass(isDefault ? "neutral" : "success");
}
