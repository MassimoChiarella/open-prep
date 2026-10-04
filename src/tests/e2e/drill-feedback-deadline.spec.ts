import { expect, test } from "@playwright/test";
import type { DrillSession } from "@/lib/domain";
import { appDatabaseName } from "@/lib/storage/appStorageTypes";

test("whole-session feedback counts down and saves unanswered timeouts exactly once", { tag: "@browser-smoke" }, async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-22T12:00:00.000Z") });
  await page.goto("/drills/session?categories=arithmetic&tags=addition&count=3&feedbackMode=instant&timeMode=session&totalSessionSeconds=60&seed=feedback-browser");
  const prompt = await page.getByTestId("active-question-prompt").textContent();
  const match = prompt?.match(/^What is (\d+) \+ (\d+)\?$/);
  expect(match).not.toBeNull();
  const answer = String(Number(match![1]) + Number(match![2]));
  await page.getByLabel("Answer", { exact: true }).fill(answer);
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByTestId("active-feedback-panel")).toContainText("Correct.");
  const before = await page.getByRole("timer").getAttribute("aria-label");
  await page.clock.fastForward(10_000);
  await expect(page.getByRole("timer")).not.toHaveAttribute("aria-label", before!);
  await page.clock.fastForward(60_000);
  await expect(page.getByRole("heading", { name: "Session Results", exact: true })).toBeVisible();
  await expect(page.getByText("Session saved on this device.", { exact: true })).toBeVisible();
  const read = () => page.evaluate((databaseName) => new Promise<DrillSession[]>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("drill_sessions", "readonly");
      const sessions = transaction.objectStore("drill_sessions").getAll();
      transaction.oncomplete = () => { database.close(); resolve(sessions.result); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    };
  }), appDatabaseName);
  const sessions = await read();
  expect(sessions).toHaveLength(1);
  expect(sessions[0].responses).toHaveLength(3);
  expect(sessions[0].responses[0]).toMatchObject({ rawInput: answer, isCorrect: true });
  for (const response of sessions[0].responses.slice(1)) expect(response).toMatchObject({ rawInput: "", timeTakenSeconds: 0, errorTypes: ["timeout"] });
  await page.clock.fastForward(60_000);
  expect(await read()).toEqual(sessions);
});
