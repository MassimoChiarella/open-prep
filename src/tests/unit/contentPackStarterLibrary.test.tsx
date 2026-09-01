import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ContentPackStarterLibrary } from "@/features/question-packs/ContentPackStarterLibrary";
import { validateQuestionPackPayload } from "@/features/question-packs/questionPack";

vi.mock("@/features/i18n/I18nProvider", () => ({
  useI18n: () => ({ t: (message: string) => message })
}));

const expectedKinds = [
  "benchmark",
  "case_practice",
  "exhibit",
  "fixed_numeric",
  "generated_template",
  "market_sizing"
] as const;

const expectedSubtypes = [
  "fixed_numeric",
  "generated_template",
  "caseStyle",
  "table",
  "bar_chart",
  "line_chart",
  "pie_chart",
  "scatterplot",
  "stacked_bar",
  "index_chart",
  "waterfall",
  "demand_side",
  "capacity_based",
  "revenue_pool",
  "supply_side",
  "fixed_timed_sequence",
  "questioningPrompts:clarifying",
  "questioningPrompts:diagnostic",
  "structuringPrompts",
  "brainstormingPrompts",
  "synthesisPrompts",
  "lessons",
  "fitPrompts",
  "fullCases:v2",
  "fullCases:v3"
] as const;

describe("ContentPackStarterLibrary", () => {
  it("represents all production kinds and every supported subtype", () => {
    const { container } = render(<ContentPackStarterLibrary />);
    const choices = [...container.querySelectorAll<HTMLElement>("[data-pack-kind]")];

    expect([...new Set(choices.map((choice) => choice.dataset.packKind))].sort()).toEqual(expectedKinds);
    expect(choices.map((choice) => choice.dataset.packSubtype)).toEqual(expectedSubtypes);
    expect(screen.getAllByRole("list")).toHaveLength(6);
  });

  it("keeps every link same-origin, downloadable, and backed by a public file", () => {
    render(<ContentPackStarterLibrary />);

    for (const link of screen.getAllByRole("link")) {
      const href = link.getAttribute("href");
      expect(href).toMatch(/^\/[a-z0-9]/i);
      expect(href).not.toContain("..");
      expect(link).toHaveAttribute("download");
      expect(existsSync(resolve(process.cwd(), "public", href?.slice(1) ?? ""))).toBe(true);
    }
  });

  it("puts guided and editable human paths before advanced schemas", () => {
    const { container } = render(<ContentPackStarterLibrary />);
    const links = [...container.querySelectorAll<HTMLAnchorElement>("a")];
    const humanIndexes = links.flatMap((link, index) => link.dataset.humanAsset === "true" ? [index] : []);
    const schemaIndexes = links.flatMap((link, index) => link.dataset.advancedSchema === "true" ? [index] : []);
    const numericFamily = container.querySelector<HTMLElement>("[data-starter-family='numeric']");
    const caseFamily = container.querySelector<HTMLElement>("[data-starter-family='case-practice']");

    expect(humanIndexes.length).toBeGreaterThan(0);
    expect(schemaIndexes).toHaveLength(2);
    expect(Math.max(...humanIndexes)).toBeLessThan(Math.min(...schemaIndexes));
    expect(numericFamily?.textContent?.indexOf("guided fixed-numeric builder")).toBeLessThan(
      numericFamily?.textContent?.indexOf("Fixed numeric questions") ?? -1
    );
    expect(caseFamily?.textContent?.indexOf("guided questioning builder")).toBeLessThan(
      caseFamily?.textContent?.indexOf("Questioning prompts: clarifying") ?? -1
    );
  });

  it("keeps the required deterministic editing guidance beside each family", () => {
    const { container } = render(<ContentPackStarterLibrary />);
    const familyText = (id: string) =>
      container.querySelector<HTMLElement>(`[data-starter-family='${id}']`)?.textContent ?? "";

    expect(familyText("numeric")).toMatch(/variables.*deterministic formulas.*units.*caseStyle/i);
    expect(familyText("exhibits")).toMatch(/source.*unit.*scale.*accessible.*color alone/i);
    expect(familyText("market-sizing")).toMatch(/assumptions.*formula.*checkpoint.*rubric.*deterministically/i);
    expect(familyText("benchmarks")).toMatch(/standard authored duration.*accommodation.*attainable.*score band/i);
    expect(familyText("case-practice")).toMatch(/cross-references.*scoring is deterministic.*limited/i);
  });

  it("uses bounded logical structure at 320px and in RTL", () => {
    const { container } = render(
      <div dir="rtl" style={{ width: 320 }}>
        <ContentPackStarterLibrary />
      </div>
    );
    const library = screen.getByTestId("content-pack-starter-library");
    const families = [...container.querySelectorAll<HTMLElement>("[data-starter-family]")];

    expect(library).toHaveClass("min-w-0", "max-w-full", "grid-cols-[minmax(0,1fr)]");
    expect(library.closest("[dir='rtl']")).not.toBeNull();
    for (const family of families) {
      expect(family).toHaveClass(
        "min-w-0",
        "max-w-full",
        "grid-cols-[minmax(0,1fr)]",
        "lg:grid-cols-[minmax(14rem,1fr)_minmax(0,2fr)]"
      );
      expect(within(family).getAllByRole("listitem").every((item) => item.classList.contains("text-start"))).toBe(true);
    }
  });

  it("round-trips every referenced pack example through production validation", () => {
    const { container } = render(<ContentPackStarterLibrary />);
    const hrefs = new Set(
      [...container.querySelectorAll<HTMLAnchorElement>("[data-pack-asset='true']")]
        .map((link) => link.getAttribute("href"))
        .filter((href): href is string => href?.endsWith(".mathdrill.json") === true)
    );

    expect(hrefs.size).toBe(13);
    for (const href of hrefs) {
      const payload = JSON.parse(readFileSync(resolve(process.cwd(), "public", href.slice(1)), "utf8")) as unknown;
      expect(validateQuestionPackPayload(payload).status, href).toBe("valid");
    }
  });
});
