import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

import type { PracticeRecord } from "../../features/case-practice/practiceTypes";
import { appDatabaseName, appDatabaseVersion } from "../../lib/storage/appStorageTypes";

test("@browser-smoke a pack with maximum encoded full-case identifiers saves and resumes a private draft", async ({ page }) => {
  const payload = JSON.parse(readFileSync(resolve("public/question-pack-v3-full-case-example.mathdrill.json"), "utf8")) as {
    id: string; packVersion: string;
    fullCases: Array<{ id: string; title: string; questioning: { id: string; maximumQuestions: number } }>;
  };
  payload.id = "p".repeat(80);
  payload.packVersion = "\u0800".repeat(100);
  payload.fullCases[0].id = "c".repeat(80);
  payload.fullCases[0].questioning.id = "q".repeat(80);
  await page.goto("/content-packs/?view=import");
  await page.getByLabel("Choose a question pack").setInputFiles({
    name: "maximum-identifiers.mathdrill.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(payload))
  });
  await expect(page.getByTestId("question-pack-preview")).toBeVisible();
  await page.getByRole("checkbox", { name: /I reviewed the answer keys/ }).check();
  await page.getByRole("button", { name: "Install Pack" }).click();
  await expect(page.getByText("Question pack installed on this device.", { exact: true })).toBeVisible();
  await page.goto(`/case-practice?pack=${payload.id}`);
  await page.getByRole("link", { name: `Open ${payload.fullCases[0].title}` }).click();
  const questions = page.getByPlaceholder("Type a question you would ask the interviewer");
  const text = "Private text saved for a maximum-identifier case.";
  await questions.first().fill(text);
  while (await questions.count() < payload.fullCases[0].questioning.maximumQuestions) {
    await page.getByRole("button", { name: "Add Question" }).click();
  }
  await page.getByRole("checkbox", { name: "Save a private draft on this device so I can resume this case." }).check();
  await expect(page.getByText("Private draft saved on this device.")).toBeVisible();
  const saved = (await readPracticeRecords(page)).find((record) => record.kind === "full_case_draft");
  expect(saved?.simulationId.length).toBeGreaterThan(1_000);
  expect(saved?.questions).toHaveLength(payload.fullCases[0].questioning.maximumQuestions);
  expect(saved?.questions.every((question) => question.id.length > 1_100)).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Resume draft" }).click();
  await expect(questions.first()).toHaveValue(text);
  await expect(questions).toHaveCount(payload.fullCases[0].questioning.maximumQuestions);
  await expect(page.getByText("Private draft saved on this device.")).toBeVisible();
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
