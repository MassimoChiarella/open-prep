import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  accessibilityCoverageProfiles,
  accessibilityCriterionScopeIds,
  accessibilityRouteStates,
  completeProcessPhaseRequirements,
  generatedAccessibilityRoutes,
  isAccessibilityReleaseReady,
  wcag22LevelAAndAaCriteria,
  type AccessibilityEvidenceRow
} from "@/tests/fixtures/accessibilityRouteStates";

const repositoryRoot = process.cwd();
const appDirectory = path.join(repositoryRoot, "src", "app");
const ledger = readFileSync(path.join(repositoryRoot, "ACCESSIBILITY_RELEASE_GATE.md"), "utf8");

describe("accessibility release gate", () => {
  it("represents every generated app route and the not-found state", () => {
    const actualRoutes = findPageFiles(appDirectory).map(toGeneratedRoute).sort();
    const fixtureRoutes = generatedAccessibilityRoutes.map(({ route }) => route).sort();

    expect(fixtureRoutes).toEqual(actualRoutes);
    expect(new Set(fixtureRoutes).size).toBe(fixtureRoutes.length);

    for (const { pageFile, route } of generatedAccessibilityRoutes) {
      expect(normalizePath(pageFile)).toBe(normalizePath(path.relative(repositoryRoot, routeToPageFile(route))));
      expect(accessibilityRouteStates.some((state) => state.route === route)).toBe(true);
      expect(ledger).toContain(`\`${route}\``);
    }

    expect(accessibilityRouteStates).toContainEqual(expect.objectContaining({
      id: "not-found:unknown-route",
      route: "*"
    }));
    expect(ledger).toContain("`not-found:unknown-route`");
  });

  it("keeps state IDs deterministic, documented, and covered by complete-process phases", () => {
    const stateIds = accessibilityRouteStates.map(({ id }) => id);
    expect(new Set(stateIds).size).toBe(stateIds.length);

    for (const state of accessibilityRouteStates) {
      expect(state.id).toMatch(/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/);
      expect(state.url).toMatch(/^\//);
      expect(state.setup.trim()).not.toBe("");
      expect(state.expectedHeading.trim()).not.toBe("");
      expect(state.scopes.length).toBeGreaterThan(0);
      expect(state.scopes.every((scope) => accessibilityCriterionScopeIds.includes(scope))).toBe(true);
      expect(accessibilityCoverageProfiles[state.coverage]).toBeDefined();
      expect(ledger).toContain(`\`${state.id}\``);
    }

    for (const [process, requiredPhases] of Object.entries(completeProcessPhaseRequirements)) {
      const representedPhases = new Set(
        accessibilityRouteStates
          .filter((state) => state.process === process)
          .map((state) => state.phase)
      );

      for (const phase of requiredPhases) expect(representedPhases.has(phase)).toBe(true);
    }
  });

  it("defines locale, theme, viewport, input, automated, and manual coverage for every profile", () => {
    for (const [id, profile] of Object.entries(accessibilityCoverageProfiles)) {
      expect(profile.locales, `${id} locales`).not.toHaveLength(0);
      expect(profile.themes, `${id} themes`).not.toHaveLength(0);
      expect(profile.viewports, `${id} viewports`).not.toHaveLength(0);
      expect(profile.inputMethods, `${id} input methods`).not.toHaveLength(0);
      expect(profile.automatedMethods, `${id} automated methods`).not.toHaveLength(0);
      expect(profile.manualMethods, `${id} manual methods`).not.toHaveLength(0);
    }

    expect(ledger).toMatch(/\| Profile \| Locales \| Themes \| Viewports \| Input methods \| Automated coverage \| Manual coverage \|/);
    expect(ledger).toContain("NVDA with Chrome on Windows");
    expect(ledger).toContain("VoiceOver with Safari on macOS");
  });

  it("lists every WCAG 2.2 Level A/AA criterion with required evidence fields", () => {
    const rows = parseCriterionRows(ledger);
    const expected = wcag22LevelAAndAaCriteria.map(([criterion, level]) => `${criterion}:${level}`);

    expect(rows.map((row) => `${row.criterion}:${row.level}`)).toEqual(expected);
    expect(rows).toHaveLength(55);

    for (const row of rows) {
      for (const value of Object.values(row)) expect(value.trim()).not.toBe("");
      expect(["A", "AA"]).toContain(row.level);
      expect(["Not run", "Partial", "Fail", "Pass", "Not applicable"]).toContain(row.result);
      expect(["Blocked", "Ready"]).toContain(row.status);
    }

    for (const criterion of ["2.4.11", "2.5.7", "2.5.8", "3.2.6", "3.3.7", "3.3.8"]) {
      expect(rows.some((row) => row.criterion === criterion)).toBe(true);
    }
  });

  it("requires evidence ownership and release sign-off while allowing independent AT records", () => {
    expect(ledger).toMatch(/\| Criterion \| Level \| Name \| Route\/state scope \| Applicability or N\/A rationale \| Automated method \| Manual method \| Evidence owner \| Evidence \| Date \| Result \| Status \|/);
    expect(ledger).toMatch(/\| Required field \| Value \| Owner \| Date \| Status \|/);

    for (const field of [
      "Release candidate/version",
      "Source revision",
      "Built artifact/provenance ID",
      "Automated axe/semantic evidence",
      "Keyboard complete-process evidence",
      "NVDA/Chrome/Windows record",
      "VoiceOver/Safari/macOS record",
      "Accessibility release decision",
      "Final release approval"
    ]) {
      expect(ledger).toContain(`| ${field} |`);
    }

    expect(ledger).toMatch(/Each assistive-technology matrix is tracked independently/i);
    expect(ledger).toMatch(/A completed NVDA matrix may be `Pass` and `Ready` while VoiceOver\/Safari remains `Not run` and `Blocked`/);
    expect(ledger).toMatch(/release is blocked unless every criterion row and route\/state row is `Ready`, both assistive-technology matrices are `Pass` and `Ready`, and the accessibility lead and release manager sign/i);

    const assistiveTechnologyRows = parseMarkdownRows(ledger)
      .filter(([matrix]) => matrix === "NVDA reference" || matrix === "VoiceOver reference");
    expect(assistiveTechnologyRows).toHaveLength(2);

    for (const row of assistiveTechnologyRows) {
      const result = row.at(-2);
      const status = row.at(-1);
      expect(["Not run", "Partial", "Fail", "Pass"]).toContain(result);
      if (result === "Pass") expect(status).toBe("Ready");
      else expect(status).toBe("Blocked");
    }
  });

  it("never treats a pending or failed row as release-ready", () => {
    for (const cells of parseMarkdownRows(ledger)) {
      const result = cells.at(-2);
      const status = cells.at(-1);

      if (result === "Not run" || result === "Partial" || result === "Fail") expect(status).toBe("Blocked");
      if (status === "Ready") expect(["Pass", "Not applicable"]).toContain(result);
    }

    const completeRow: AccessibilityEvidenceRow = {
      date: "2026-08-31",
      evidence: "artifacts/accessibility/example.json",
      owner: "Accessibility reviewer",
      result: "pass",
      status: "ready"
    };

    expect(isAccessibilityReleaseReady([completeRow])).toBe(true);
    expect(isAccessibilityReleaseReady([])).toBe(false);
    expect(isAccessibilityReleaseReady([{ ...completeRow, result: "not_run" }])).toBe(false);
    expect(isAccessibilityReleaseReady([{ ...completeRow, result: "fail" }])).toBe(false);
    expect(isAccessibilityReleaseReady([{ ...completeRow, evidence: "" }])).toBe(false);
    expect(isAccessibilityReleaseReady([{ ...completeRow, date: "TBD" }])).toBe(false);
  });

  it("states the limit of automation and prohibits broad exceptions", () => {
    expect(ledger).toMatch(/Passing automation is not legal certification/i);
    expect(ledger).toMatch(/does not replace qualified human evaluation/i);
    expect(ledger).toMatch(/must not send page data or learner data to an external scanner/i);
    expect(ledger).toMatch(/Broad rule suppression is prohibited/i);
  });
});

interface CriterionRow {
  applicability: string;
  automatedMethod: string;
  criterion: string;
  date: string;
  evidence: string;
  manualMethod: string;
  name: string;
  owner: string;
  level: string;
  result: string;
  scope: string;
  status: string;
}

function findPageFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findPageFiles(entryPath);
    return entry.isFile() && entry.name === "page.tsx" ? [entryPath] : [];
  });
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/");
}

function routeToPageFile(route: string): string {
  return route === "/"
    ? path.join(appDirectory, "page.tsx")
    : path.join(appDirectory, ...route.slice(1).split("/"), "page.tsx");
}

function toGeneratedRoute(filePath: string): string {
  const relative = normalizePath(path.relative(appDirectory, filePath));
  return relative === "page.tsx" ? "/" : `/${relative.replace(/\/page\.tsx$/, "")}`;
}

function parseMarkdownRows(markdown: string): string[][] {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim()));
}

function parseCriterionRows(markdown: string): CriterionRow[] {
  return parseMarkdownRows(markdown)
    .filter(([criterion]) => /^`\d+\.\d+\.\d+`$/.test(criterion ?? ""))
    .map((cells) => {
      expect(cells).toHaveLength(12);
      const [criterion, level, name, scope, applicability, automatedMethod, manualMethod, owner, evidence, date, result, status] = cells;
      return {
        applicability,
        automatedMethod,
        criterion: criterion.slice(1, -1),
        date,
        evidence,
        level,
        manualMethod,
        name,
        owner,
        result,
        scope,
        status
      };
    });
}
