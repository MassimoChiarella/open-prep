import { resolve } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  accessibilityRouteStates,
  type AccessibilityRouteState
} from "../fixtures/accessibilityRouteStates";
import { appDatabaseName, appDatabaseVersion } from "../../lib/storage/appStorageTypes";

const entryStateIds = [
  "dashboard:first-run",
  "benchmark:selection-empty",
  "benchmark:session-active",
  "case-hub:default",
  "brainstorming:entry",
  "fit:story-entry",
  "lessons:entry",
  "prep-plan:entry",
  "questioning:entry",
  "full-case:questioning",
  "structuring:entry",
  "synthesis:entry",
  "content-packs:discover-empty",
  "content-pack-downloads:default",
  "drill:setup-default",
  "drill:session-active",
  "drill:summary-empty",
  "exhibit:active",
  "exhibit-sprint:setup",
  "formulas:library",
  "privacy:disclosure",
  "market-sizing:assumptions",
  "progress:empty",
  "settings:default",
  "not-found:unknown-route"
] as const;

const entryStates = entryStateIds.map(findState);

test.describe("WCAG 2.2 route and state coverage", () => {
  for (const state of entryStates) {
    test(`${state.id} has no tagged A/AA axe violations`, async ({ page }) => {
      await openState(page, state);
      await expectNoWcagViolations(page, state.id);
    });
  }

  test("drill validation and feedback states have no tagged A/AA axe violations", async ({ page }) => {
    const state = findState("drill:session-validation-error");
    await openState(page, state);

    await page.getByLabel("Answer", { exact: true }).fill("not a number");
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText("Enter a valid number.")).toBeVisible();
    await expectNoWcagViolations(page, "drill:session-validation-error");

    await page.getByLabel("Answer", { exact: true }).fill("0");
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByTestId("active-feedback-panel")).toContainText("Needs review");
    await expectNoWcagViolations(page, "drill:session-feedback");
  });

  test("exhibit validation and feedback states have no tagged A/AA axe violations", async ({ page }) => {
    const state = findState("exhibit:active");
    await openState(page, state);

    await page.getByRole("button", { name: "Submit Answer" }).click();
    await expect(page.getByText("Enter an answer before submitting.")).toBeVisible();
    await expectNoWcagViolations(page, "exhibit:validation-error");

    await page.getByLabel("Answer", { exact: true }).fill("0");
    await page.getByRole("button", { name: "Submit Answer" }).click();
    await expect(page.getByText(/Attempt saved on this device\.|could not be saved on this device/)).toBeVisible();
    await expectNoWcagViolations(page, "exhibit:feedback");
  });

  test("Exhibit Sprint timeout feedback has no tagged A/AA axe violations", async ({ page }) => {
    const state = findState("exhibit-sprint:timeout-feedback");
    await openState(page, findState("exhibit-sprint:setup"));
    await page.clock.install({ time: new Date("2026-06-02T12:00:00.000Z") });

    await page.getByLabel("3", { exact: true }).check();
    await page.getByRole("button", { name: "Start Exhibit Sprint" }).click();
    await expect(page.getByRole("timer")).toContainText("remaining");
    await page.clock.fastForward(90_000);
    await expect(page.getByTestId("exhibit-sprint-feedback")).toContainText(
      "Time expired. Review the answer, then continue."
    );
    await expect(page.getByTestId("exhibit-sprint-feedback")).toContainText("Saved on this device");
    await expectNoWcagViolations(page, state.id);
  });

  test("completed drill summary has no tagged A/AA axe violations", async ({ page }) => {
    const state = findState("drill:summary-complete");
    await openState(page, findState("drill:session-active"));

    await page.getByLabel("Answer", { exact: true }).fill("0");
    await page.getByRole("button", { name: "Submit" }).click();
    await page.getByRole("button", { name: "View summary" }).click();
    await expect(page.getByRole("heading", { name: "Session Results" })).toBeVisible();
    await expect(page.getByText("Question Review", { exact: true })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Session saved on this device." })).toBeVisible();
    await expectNoWcagViolations(page, state.id);
  });

  test("warmed drill rendered offline has no tagged A/AA axe violations", async ({ page }) => {
    const state = findState("drill:session-offline");
    await openState(page, state);
    await expect.poll(
      () => page.evaluate(async () => (await navigator.serviceWorker.getRegistration("/")) !== undefined),
      { timeout: 10_000 }
    ).toBe(true);
    await page.evaluate(async () => navigator.serviceWorker.ready.then(() => undefined));
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: state.expectedHeading })).toBeVisible();

    await page.context().setOffline(true);
    try {
      await page.reload();
      await expect(page.getByRole("heading", { level: 1, name: state.expectedHeading })).toBeVisible();
      await expect(page.getByTestId("offline-status-indicator")).toHaveText("Offline ready");
      await expectNoWcagViolations(page, state.id);
    } finally {
      await page.context().setOffline(false);
    }
  });

  test("content-pack validation and review states have no tagged A/AA axe violations", async ({ page }) => {
    await openState(page, findState("content-packs:import-entry"));
    const fileInput = page.getByLabel("Choose a question pack");

    await fileInput.setInputFiles({
      buffer: Buffer.from("{}"),
      mimeType: "application/json",
      name: "invalid.mathdrill.json"
    });
    await expect(page.getByRole("alert", { name: /Fix 1 problem before importing/ })).toBeVisible();
    await expectNoWcagViolations(page, "content-packs:import-invalid");

    await fileInput.setInputFiles(resolve(process.cwd(), "public", "question-pack-example.mathdrill.json"));
    await expect(page.getByTestId("question-pack-preview")).toBeVisible();
    await expectNoWcagViolations(page, "content-packs:import-review");
  });

  test("expanded Settings and reset confirmation have no tagged A/AA axe violations", async ({ page }) => {
    await openState(page, findState("settings:default"));
    await page.getByTestId("settings-local-data").locator("summary").click();
    await expectNoWcagViolations(page, "settings:local-data-expanded");

    await page.locator("summary").filter({ hasText: "Reset local data" }).click();
    await page.getByLabel("I understand this clears local practice data on this device.").check();
    await expect(page.getByRole("button", { name: "Reset Local Data" })).toBeEnabled();
    await expectNoWcagViolations(page, "settings:reset-confirmation");
  });

  test("Settings backup and destructive-data states have no tagged A/AA axe violations", async ({ page }) => {
    await openState(page, findState("settings:default"));
    await page.getByTestId("settings-reset").getByText("No saved personal text was found.").waitFor({ state: "attached" });
    await seedSettingsPersonalData(page);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Local App Settings" })).toBeVisible();

    const localDataSummary = page.getByTestId("settings-local-data").locator("summary");
    await localDataSummary.click();
    await page.getByRole("button", { name: "Prepare Complete Backup" }).click();
    await expect(page.getByTestId("complete-backup-export-preview")).toBeVisible();
    await expectNoWcagViolations(page, "settings:complete-backup-preview");

    await page.getByLabel("Choose a complete backup file").setInputFiles({
      buffer: Buffer.from("{"),
      mimeType: "application/json",
      name: "invalid-complete-backup.json"
    });
    await expect(
      page.getByRole("status").filter({ hasText: "Complete backup must contain valid JSON." })
    ).toBeVisible();
    await expectNoWcagViolations(page, "settings:complete-backup-invalid-restore");
    await localDataSummary.click();

    const resetSummary = page.locator("summary").filter({ hasText: "Reset local data" });
    await resetSummary.click();
    const personalConfirmation = page.getByRole("checkbox", {
      name: "I understand this removes only the personal text listed above."
    });
    await expect(personalConfirmation).toBeEnabled();
    await personalConfirmation.check();
    await expect(page.getByRole("button", { name: "Clear Personal Data" })).toBeEnabled();
    await expectNoWcagViolations(page, "settings:personal-data-confirmation");
    await personalConfirmation.uncheck();

    const allDataConfirmation = page.getByRole("checkbox", {
      name: "I understand this clears all saved app data from this browser."
    });
    await expect(allDataConfirmation).toBeEnabled();
    await allDataConfirmation.check();
    await expect(page.getByRole("button", { name: "Clear All Saved App Data" })).toBeEnabled();
    await expectNoWcagViolations(page, "settings:all-data-confirmation");
  });
});

async function openState(page: Page, state: AccessibilityRouteState): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(state.url);
  await expect(page.getByRole("heading", { level: 1, name: state.expectedHeading })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

async function expectNoWcagViolations(page: Page, stateId: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .options({ resultTypes: ["violations"] })
    .analyze();
  const diagnostics = results.violations.flatMap((violation) => violation.nodes.map((node) => ({
    help: violation.help,
    helpUrl: violation.helpUrl,
    impact: violation.impact,
    rule: violation.id,
    summary: node.failureSummary,
    target: JSON.stringify(node.target)
  })));

  expect(diagnostics, `${stateId} accessibility violations`).toEqual([]);
}

function findState(id: string): AccessibilityRouteState {
  const state = accessibilityRouteStates.find((candidate) => candidate.id === id);
  if (state === undefined) throw new Error(`Unknown accessibility state: ${id}`);
  return state;
}

async function seedSettingsPersonalData(page: Page): Promise<void> {
  await page.evaluate(({ databaseName, databaseVersion }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("practice_records", "readwrite");
      transaction.objectStore("practice_records").put({
        action: "Built a deterministic test plan.",
        competency: "leadership",
        id: "axe-private-story",
        kind: "fit_story",
        reflection: "Keep the explanation concise.",
        result: "The team delivered on time.",
        situation: "A synthetic accessibility fixture.",
        task: "Coordinate a small team.",
        title: "Axe private story",
        updatedAt: "2026-01-01T00:00:00.000Z"
      });
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error);
      };
    };
  }), { databaseName: appDatabaseName, databaseVersion: appDatabaseVersion });
}
