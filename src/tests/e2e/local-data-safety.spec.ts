import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
  type Request
} from "@playwright/test";

import {
  appDatabaseName,
  appDatabaseVersion,
  appStoreNames
} from "../../lib/storage/appStorageTypes";
import { localPreferenceKeys } from "../../features/settings/localDataInventory";

const privateStoryTitle = "Cross-tab private story";
const preservedAttemptId = "local-data-safety-attempt";
const syntheticPackId = "local-data-safety-pack";

test(
  "personal clear preserves practice data and invalidates every open private view",
  { tag: "@browser-smoke" },
  async ({ context, page }) => {
    await seedLocalData(page);
    const privatePage = await openPrivateStoryPage(context);
    const network = monitorUnexpectedTransmission(context, new URL(page.url()).origin);

    await openResetSettings(page);
    await expect(page.getByRole("button", { name: "Clear Personal Data" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear All Saved App Data" })).toBeVisible();

    const confirmation = page.getByRole("checkbox", {
      name: "I understand this removes only the personal text listed above."
    });
    await expect(confirmation).toBeEnabled();
    await tabTo(page, confirmation);
    await page.keyboard.press("Space");

    const clearButton = page.getByRole("button", { name: "Clear Personal Data" });
    await page.keyboard.press("Tab");
    await expect(clearButton).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL("/");
    await expect(privatePage).toHaveURL("/");
    const records = await readStore(page, "practice_records");
    expect(records.map((record) => record.id)).toEqual([preservedAttemptId]);
    expect((await readStore(page, "question_packs")).map((record) => record.id)).toEqual([
      syntheticPackId
    ]);
    expect(await page.evaluate((key) => localStorage.getItem(key), localPreferenceKeys[1])).toBe(
      "dark"
    );

    await assertPrivateStoryCannotReturn(privatePage);
    network.stop();
    expect(network.unexpected).toEqual([]);
  }
);

test("clear all removes every record and preference and invalidates every open private view", async ({
  context,
  page
}) => {
  await seedLocalData(page);
  const privatePage = await openPrivateStoryPage(context);
  const network = monitorUnexpectedTransmission(context, new URL(page.url()).origin);

  await openResetSettings(page);
  const confirmation = page.getByRole("checkbox", {
    name: "I understand this clears all saved app data from this browser."
  });
  await expect(confirmation).toBeEnabled();
  await tabTo(page, confirmation);
  await page.keyboard.press("Space");

  const clearButton = page.getByRole("button", { name: "Clear All Saved App Data" });
  await page.keyboard.press("Tab");
  await expect(clearButton).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL("/");
  await expect(privatePage).toHaveURL("/");
  expect(await readStoreCounts(page)).toEqual(
    Object.fromEntries(appStoreNames.map((storeName) => [storeName, 0]))
  );
  expect(
    await page.evaluate((keys) => keys.map((key) => localStorage.getItem(key)), localPreferenceKeys)
  ).toEqual(localPreferenceKeys.map(() => null));

  await assertPrivateStoryCannotReturn(privatePage);
  network.stop();
  expect(network.unexpected).toEqual([]);
});

async function seedLocalData(page: Page): Promise<void> {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Local App Settings" })).toBeVisible();
  await page.getByTestId("settings-reset").getByText("No saved personal text was found.").waitFor({ state: "attached" });

  await page.evaluate(({ databaseName, databaseVersion, pack, records }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(["practice_records", "question_packs"], "readwrite");
      const practiceStore = transaction.objectStore("practice_records");
      for (const record of records) practiceStore.put(record);
      transaction.objectStore("question_packs").put(pack);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error);
      };
    };
  }), {
    databaseName: appDatabaseName,
    databaseVersion: appDatabaseVersion,
    pack: syntheticPack(),
    records: [syntheticFitStory(), syntheticPracticeAttempt()]
  });
  await page.evaluate((key) => localStorage.setItem(key, "dark"), localPreferenceKeys[1]);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Local App Settings" })).toBeVisible();
}

async function openPrivateStoryPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto("/");
  await page.goto("/case-practice/fit");
  await expect(page.getByRole("heading", { level: 1, name: "Fit and Behavioral Practice" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 4, name: privateStoryTitle })).toBeVisible();
  return page;
}

async function openResetSettings(page: Page): Promise<void> {
  const summary = page.locator("summary").filter({ hasText: "Reset local data" });
  await tabTo(page, summary);
  await page.keyboard.press("Enter");
  await expect(summary.locator("..")).toHaveAttribute("open", "");
}

async function assertPrivateStoryCannotReturn(page: Page): Promise<void> {
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 4, name: privateStoryTitle })).toHaveCount(0);
  await page.goForward({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 4, name: privateStoryTitle })).toHaveCount(0);

  await page.goto("/case-practice/fit");
  await expect(page.getByRole("heading", { level: 1, name: "Fit and Behavioral Practice" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 4, name: privateStoryTitle })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 4, name: privateStoryTitle })).toHaveCount(0);
}

async function tabTo(page: Page, target: Locator): Promise<void> {
  await expect(target).toBeVisible();

  for (let attempt = 0; attempt < 160; attempt += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }

  await expect(target).toBeFocused();
}

async function readStore(page: Page, storeName: "practice_records" | "question_packs") {
  return page.evaluate(({ databaseName, databaseVersion, storeName }) => new Promise<Array<{ id: string }>>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(storeName, "readonly");
      const getAllRequest = transaction.objectStore(storeName).getAll();
      getAllRequest.onsuccess = () => resolve(getAllRequest.result as Array<{ id: string }>);
      getAllRequest.onerror = () => reject(getAllRequest.error);
      transaction.oncomplete = () => database.close();
    };
  }), { databaseName: appDatabaseName, databaseVersion: appDatabaseVersion, storeName });
}

async function readStoreCounts(page: Page): Promise<Record<string, number>> {
  return page.evaluate(({ databaseName, databaseVersion, storeNames }) => new Promise<Record<string, number>>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(storeNames, "readonly");
      const counts = Object.fromEntries(storeNames.map((storeName) => [storeName, 0]));
      for (const storeName of storeNames) {
        const countRequest = transaction.objectStore(storeName).count();
        countRequest.onsuccess = () => {
          counts[storeName] = countRequest.result;
        };
        countRequest.onerror = () => reject(countRequest.error);
      }
      transaction.oncomplete = () => {
        database.close();
        resolve(counts);
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error);
      };
    };
  }), {
    databaseName: appDatabaseName,
    databaseVersion: appDatabaseVersion,
    storeNames: appStoreNames
  });
}

function monitorUnexpectedTransmission(context: BrowserContext, origin: string) {
  const unexpected: string[] = [];
  const listener = (request: Request) => {
    const method = request.method();
    const url = request.url();
    const requestOrigin = new URL(url).origin;
    if (
      requestOrigin !== origin ||
      (method !== "GET" && method !== "HEAD") ||
      url.toLowerCase().includes("cross-tab-private")
    ) {
      unexpected.push(`${method} ${url}`);
    }
  };

  context.on("request", listener);
  return {
    stop: () => context.off("request", listener),
    unexpected
  };
}

function syntheticFitStory() {
  return {
    action: "Built a deterministic test plan.",
    competency: "leadership",
    id: "local-data-safety-story",
    kind: "fit_story",
    reflection: "Keep the explanation concise.",
    result: "The team delivered on time.",
    situation: "A synthetic local-data fixture.",
    task: "Coordinate a small team.",
    title: privateStoryTitle,
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

function syntheticPracticeAttempt() {
  return {
    completedAt: "2026-01-01T00:05:00.000Z",
    id: preservedAttemptId,
    itemId: "local-data-safety-item",
    kind: "attempt",
    maxScore: 1,
    module: "fit",
    score: 1
  };
}

function syntheticPack() {
  return {
    format: "math-drill-question-pack",
    id: syntheticPackId,
    importedAt: "2026-01-01T00:00:00.000Z",
    kind: "fixed_numeric",
    packVersion: "1.0.0",
    questions: [
      {
        answer: { tolerance: { type: "absolute", value: 0 }, unit: "number", value: 4 },
        category: "arithmetic",
        difficulty: "beginner",
        explanation: { short: "Add the two values.", steps: ["2 + 2 = 4."] },
        id: "local-data-safety-question",
        prompt: "What is 2 + 2?",
        tags: ["addition"],
        type: "numeric"
      }
    ],
    schemaVersion: 2,
    title: "Local Data Safety Pack"
  };
}
