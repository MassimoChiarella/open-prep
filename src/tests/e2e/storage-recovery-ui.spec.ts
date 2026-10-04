import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { submitAnswer } from "@/features/drills/answerSubmission";
import { completeDrillSession } from "@/features/drills/sessionCompletion";
import { createStoredDrillSession, createStoredUserResponses, createStoredMistakeNotebookRecords, createRetryScheduleRecord } from "@/features/drills/drillPersistence";
import { appDatabaseName, appStoreNames, type AppStoreName, type StoredDrillSession } from "@/lib/storage/appStorageTypes";

for (const choice of ["view", "fork"] as const) test(`two tabs retain conflicting answers and explicitly ${choice} the saved attempt`, { tag: "@browser-smoke" }, async ({ context, page }) => {
  const path = "/drills/session?categories=arithmetic&tags=addition&count=1&feedbackMode=end_of_session&seed=two-tab-recovery";
  await page.goto(path);
  await expect(page.getByLabel("Answer", { exact: true })).toBeVisible();
  await expect.poll(async () => (await readStore<StoredDrillSession>(page, "drill_sessions")).length).toBe(1);
  const winner = await context.newPage();
  await winner.goto(path);
  await expect(winner.getByLabel("Answer", { exact: true })).toBeVisible();
  await winner.getByLabel("Answer", { exact: true }).fill("111");
  await winner.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(winner.getByText("Session saved on this device.", { exact: true })).toBeVisible();
  const acknowledged = await readStore<StoredDrillSession>(winner, "drill_sessions");
  expect(acknowledged).toHaveLength(1);
  expect(acknowledged[0].responses[0].rawInput).toBe("111");

  await page.getByLabel("Answer", { exact: true }).fill("222");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByText("This attempt changed in another tab. Your answers are still here. Choose which attempt to keep working with.")).toBeVisible();
  expect(await readStore(page, "drill_sessions")).toEqual(acknowledged);
  await page.getByRole("button", { name: choice === "fork" ? "Keep my answers as a separate attempt" : "View saved attempt", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Session Results", exact: true })).toBeVisible();
  await expect(page.getByText("Session saved on this device.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Keep my answers as a separate attempt", exact: true })).toHaveCount(0);
  const saved = await readStore<StoredDrillSession>(page, "drill_sessions");
  if (choice === "view") {
    expect(saved).toEqual(acknowledged);
    await expect(page.getByText('"111"', { exact: true })).toBeVisible();
  } else {
    expect(saved).toHaveLength(2);
    expect(saved.find((session) => session.id === acknowledged[0].id)).toEqual(acknowledged[0]);
    const separate = saved.find((session) => session.id !== acknowledged[0].id)!;
    expect(separate.responses[0].rawInput).toBe("222");
    expect(separate.startedAt).toBe(acknowledged[0].startedAt);
    expect(separate.questionIds).toEqual(acknowledged[0].questionIds);
  }
});

test("legacy record recovery archives originals, requires confirmation, and preserves unrelated history", { tag: "@browser-smoke" }, async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Local App Settings", exact: true })).toBeVisible();
  const created = createDrillSession({ seed: "recovery-ui", startedAt: "2026-09-22T12:00:00.000Z", settings: { questionCount: 1 } });
  const answered = submitAnswer({ ...created, question: created.questions[0], rawInput: "wrong", timeTakenSeconds: 1 });
  const session = createStoredDrillSession(completeDrillSession({ session: answered.session, questions: created.questions }), created.questions);
  session.responses[0].rawInput = "x".repeat(100001);
  session.responses[0].normalizedValue = Infinity;
  const responses = createStoredUserResponses(session, created.questions);
  const mistakes = createStoredMistakeNotebookRecords(session, created.questions);
  const sentinel = { id: "unrelated-practice", kind: "attempt", module: "fit", itemId: "synthetic-interview", completedAt: "2026-09-22T11:00:00.000Z", score: 3, maxScore: 4 };
  const seeded = { drill_sessions: [session], responses, mistake_notebook: mistakes, retry_schedules: mistakes.map((mistake) => createRetryScheduleRecord(mistake)), practice_records: [sentinel] };
  // Raw IndexedDB represents pre-fix data; today's adapter deliberately refuses these values.
  await page.evaluate(({ name, records }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(Object.keys(records), "readwrite");
      for (const [store, values] of Object.entries(records)) for (const record of values) transaction.objectStore(store).put(record);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    };
  }), { name: appDatabaseName, records: seeded });
  await page.reload();
  await page.getByTestId("settings-local-data").locator("summary").click();
  await page.getByRole("button", { name: "Export Local Progress", exact: true }).click();
  await page.getByRole("link", { name: "Review incompatible records", exact: true }).click();
  await page.getByRole("button", { name: "Check local records", exact: true }).click();
  await expect(page.locator("#record-recovery")).toContainText("Number is not finite.");
  await page.getByRole("button", { name: "Review recovery", exact: true }).click();
  const confirm = page.getByRole("button", { name: "Confirm scoped removal", exact: true });
  for (const store of ["drill_sessions", "responses", "mistake_notebook", "retry_schedules"]) {
    await expect(page.locator("#record-recovery")).toContainText(`${store}: 1`);
  }
  await expect(confirm).toBeDisabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await readStore<StoredDrillSession>(page, "drill_sessions"))[0].responses[0].normalizedValue).toBe(Infinity);
  await page.getByRole("button", { name: "Review recovery", exact: true }).click();
  const archiveDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download original-data archive", exact: true }).click();
  const archive = await archiveDownload;
  const archiveText = await readFile((await archive.path())!, "utf8");
  expect(JSON.parse(archiveText)).toMatchObject({ format: "open-prep-record-recovery", schemaVersion: 1, records: expect.any(Array) });
  expect(JSON.parse(archiveText).records).toHaveLength(4);
  expect(archiveText).toContain('"Infinity"');
  expect(archiveText).toContain("x".repeat(100001));
  expect(archiveText).not.toContain(sentinel.id);
  await expect(confirm).toBeDisabled();
  await page.getByRole("checkbox", { name: "I have saved the archive or chosen to continue without it, and confirm this removal.", exact: true }).check();
  await confirm.click();
  await expect(page).toHaveURL("/");
  for (const store of appStoreNames.filter((name) => name !== "practice_records")) expect(await readStore(page, store)).toEqual([]);
  expect(await readStore(page, "practice_records")).toEqual([sentinel]);
  await page.goto("/settings");
  await page.getByTestId("settings-local-data").locator("summary").click();
  const progressDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Local Progress", exact: true }).click();
  const progress = await progressDownload;
  expect(JSON.parse(await readFile((await progress.path())!, "utf8")).stores.practice_records).toEqual([sentinel]);
});

async function readStore<T = unknown>(page: Page, storeName: AppStoreName): Promise<T[]> {
  return page.evaluate(({ name, storeName }) => new Promise<T[]>((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(storeName, "readonly");
      const records = transaction.objectStore(storeName).getAll();
      transaction.oncomplete = () => { database.close(); resolve(records.result as T[]); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    };
  }), { name: appDatabaseName, storeName });
}
