import { expect, test, type Page } from "@playwright/test";

import { appDatabaseVersion, appStoreNames } from "../../lib/storage/appStorageTypes";

test("database upgrade removes the legacy saved-preset store", async ({ page }) => {
  await clearLocalDatabase(page);
  await page.evaluate(() => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("consulting_math_drill_tool", 6);

      request.onupgradeneeded = () => request.result.createObjectStore("drill_presets", { keyPath: "id" });
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  });

  await page.goto("/drills");
  await expect(page.getByText(/Built-in defaults loaded/)).toBeVisible();

  expect(await readStoreNames(page)).not.toContain("drill_presets");
});

test("local practice journey updates dashboard and progress, then reset returns to first-run state", async ({ page }) => {
  await clearLocalDatabase(page);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Start with a focused drill" })).toBeVisible();
  await expect(page.getByTestId("first-run-quick-starts")).toBeVisible();

  await page.goto("/drills/session?categories=arithmetic&tags=addition&count=1&feedbackMode=instant");
  await expect(page.getByRole("heading", { name: "Active Drill Session" })).toBeVisible();

  const prompt = await page.getByTestId("active-question-prompt").textContent();
  const answer = solveAdditionPrompt(prompt ?? "");

  await page.getByLabel("Answer", { exact: true }).fill(String(answer));
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("button", { name: "View summary" }).click();
  await expect(page.getByText("Session saved on this device.")).toBeVisible();
  await expect(page.getByText("Question Review")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByTestId("first-run-quick-starts")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-priority-panel")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recommended Next Drill" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Last Session" })).toBeVisible();
  await expect(page.getByTestId("recent-sessions-table")).toContainText("Arithmetic");

  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Progress Dashboard" })).toBeVisible();
  await expect(page.getByTestId("progress-what-changed")).toBeVisible();
  await expect(page.getByTestId("progress-next-practice")).toBeVisible();
  await expect(page.getByTestId("progress-details")).toContainText("Addition");

  const countsBeforeReset = await readStoreCounts(page);

  expect(countsBeforeReset.drill_sessions).toBeGreaterThan(0);
  expect(countsBeforeReset.responses).toBeGreaterThan(0);

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Local App Settings" })).toBeVisible();
  await page.locator("summary").filter({ hasText: "Reset local data" }).click();
  await page.getByLabel("I understand this clears local practice data on this device.").check();
  await page.getByRole("button", { name: "Reset Local Data" }).click();
  await expect(page.getByText("Local data reset. Default preferences are active again.")).toBeVisible();

  const countsAfterReset = await readStoreCounts(page);

  expect(countsAfterReset).toEqual({
    benchmark_results: 0,
    drill_sessions: 0,
    exhibit_attempts: 0,
    market_sizing_attempts: 0,
    mistake_notebook: 0,
    practice_records: 0,
    question_packs: 0,
    responses: 0,
    retry_schedules: 0,
    user_settings: 0
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Start with a focused drill" })).toBeVisible();
  await expect(page.getByTestId("first-run-quick-starts")).toBeVisible();
  await expect(page.getByTestId("dashboard-priority-panel")).toHaveCount(0);

  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "No drill history yet." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start Drill" })).toBeVisible();
});

test("a local question pack can be installed and practiced", async ({ page }) => {
  await clearLocalDatabase(page);
  await page.goto("/settings");
  await page.locator("summary").filter({ hasText: "Content Packs" }).click();

  await page.getByLabel("Choose a question pack").setInputFiles({
    buffer: Buffer.from(JSON.stringify(questionPackPayload())),
    mimeType: "application/json",
    name: "company-case-prep.mathdrill.json"
  });

  await expect(page.getByTestId("question-pack-preview")).toContainText("Company Case Prep");
  await page.getByRole("button", { name: "Install Pack" }).click();

  const packCard = page.getByTestId("question-pack-company-case-prep");
  await expect(packCard).toBeVisible();
  await packCard.getByRole("link", { name: "Practice intermediate (1)" }).click();

  await expect(page.getByRole("heading", { name: "Company Case Prep Drill" })).toBeVisible();
  await expect(page.getByTestId("active-question-prompt")).toContainText("profit margin");
  await page.getByLabel("Answer", { exact: true }).fill("25%");
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Correct.")).toBeVisible();
  await page.getByRole("button", { name: "View summary" }).click();
  await expect(page.getByText("Session saved on this device.")).toBeVisible();
});

async function clearLocalDatabase(page: Page): Promise<void> {
  await page.goto("/formulas");
  await page.evaluate(() => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("consulting_math_drill_tool");

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Local database deletion was blocked."));
    });
  });
}

async function readStoreCounts(page: Page): Promise<Record<(typeof appStoreNames)[number], number>> {
  return page.evaluate(({ storeNames, version }) => {
    return new Promise<Record<(typeof storeNames)[number], number>>((resolve, reject) => {
      const request = indexedDB.open("consulting_math_drill_tool", version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(storeNames, "readonly");
        const counts = Object.fromEntries(storeNames.map((storeName) => [storeName, 0])) as Record<
          (typeof storeNames)[number],
          number
        >;

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
    });
  }, { storeNames: appStoreNames, version: appDatabaseVersion });
}

async function readStoreNames(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    return new Promise<string[]>((resolve, reject) => {
      const request = indexedDB.open("consulting_math_drill_tool");

      request.onsuccess = () => {
        const database = request.result;
        const storeNames = Array.from(database.objectStoreNames);

        database.close();
        resolve(storeNames);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

function solveAdditionPrompt(prompt: string): number {
  const match = prompt.match(/^What is (?<left>\d+) \+ (?<right>\d+)\?$/);

  if (match?.groups === undefined) {
    throw new Error(`Unexpected generated prompt: ${prompt}`);
  }

  return Number(match.groups.left) + Number(match.groups.right);
}

function questionPackPayload() {
  return {
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "fixed_numeric",
    id: "company-case-prep",
    packVersion: "1.0.0",
    title: "Company Case Prep",
    questions: [
      {
        id: "margin-001",
        type: "numeric",
        category: "business_math",
        tags: ["margin"],
        difficulty: "intermediate",
        prompt: "Revenue is $12M and profit is $3M. What is the profit margin?",
        answer: {
          value: 0.25,
          unit: "percentage",
          tolerance: { type: "absolute", value: 0.001 }
        },
        explanation: {
          short: "Divide profit by revenue.",
          steps: ["Margin = 3 / 12 = 0.25, or 25%."]
        }
      }
    ]
  };
}
