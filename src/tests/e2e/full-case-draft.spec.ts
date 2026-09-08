import { expect, test, type Page } from "@playwright/test";

import type { PracticeRecord } from "../../features/case-practice/practiceTypes";
import { appDatabaseName, appDatabaseVersion } from "../../lib/storage/appStorageTypes";

test("a private full-case draft opts in, resumes its stage, and is discarded", { tag: "@browser-smoke" }, async ({ page }) => {
  await page.goto("/case-practice/simulation");
  const optIn = page.getByRole("checkbox", { name: "Save a private draft on this device so I can resume this case." });
  await expect(optIn).toBeEnabled();
  const questions = page.getByPlaceholder("Type a question you would ask the interviewer");
  const firstQuestion = "Synthetic private question about the client's objective.";
  await questions.first().fill(firstQuestion);
  expect(await readPracticeRecords(page)).toEqual([]);

  await optIn.check();
  await expect.poll(async () => (await readPracticeRecords(page)).filter((record) => record.kind === "full_case_draft")).toEqual([
    expect.objectContaining({ questions: expect.arrayContaining([expect.objectContaining({ text: firstQuestion })]) })
  ]);
  for (let index = 1; index < await questions.count(); index += 1) {
    await questions.nth(index).fill(`Synthetic private question ${index + 1} about the business.`);
  }
  await page.getByRole("button", { name: "Continue to Structure" }).click();
  await expect(page.locator("#structure-stage-heading")).toBeVisible();
  await expect.poll(async () => (await readPracticeRecords(page)).filter((record) => record.kind === "full_case_draft")).toEqual([
    expect.objectContaining({ stage: 1 })
  ]);

  await page.reload();
  await page.getByRole("button", { name: "Resume draft" }).click();
  await expect(page.locator("#structure-stage-heading")).toBeVisible();
  await expect(optIn).toBeChecked();
  await page.getByRole("button", { name: "Previous Stage" }).click();
  await expect(questions.first()).toHaveValue(firstQuestion);

  await page.reload();
  await page.getByRole("button", { name: "Discard draft" }).click();
  await expect.poll(() => readPracticeRecords(page)).toEqual([]);
  await expect(optIn).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Resume draft" })).toHaveCount(0);
  await page.reload();
  await expect(optIn).toBeEnabled();
  await expect(page.getByRole("button", { name: "Resume draft" })).toHaveCount(0);
  expect(await readPracticeRecords(page)).toEqual([]);
});

async function readPracticeRecords(page: Page): Promise<PracticeRecord[]> {
  return page.evaluate(({ name, version }) => new Promise<PracticeRecord[]>((resolve, reject) => {
    const open = indexedDB.open(name, version);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const database = open.result;
      const transaction = database.transaction("practice_records", "readonly");
      const records = transaction.objectStore("practice_records").getAll();
      transaction.oncomplete = () => { database.close(); resolve(records.result); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    };
  }), { name: appDatabaseName, version: appDatabaseVersion });
}
