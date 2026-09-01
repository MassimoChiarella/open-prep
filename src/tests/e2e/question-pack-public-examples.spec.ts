import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

interface PublicExample {
  fileName: string;
  id: string;
  kind: "benchmark" | "case_practice" | "exhibit" | "fixed_numeric" | "generated_template" | "market_sizing";
  title: string;
}

const publicDirectory = resolve(process.cwd(), "public");
const publicExamples = readdirSync(publicDirectory)
  .filter((fileName) => fileName.endsWith(".mathdrill.json"))
  .sort()
  .map((fileName): PublicExample => {
    const payload = JSON.parse(readFileSync(resolve(publicDirectory, fileName), "utf8")) as Omit<PublicExample, "fileName">;
    return { fileName, id: payload.id, kind: payload.kind, title: payload.title };
  });

test("discovers all 13 public example packs", () => {
  expect(publicExamples).toHaveLength(13);
});

for (const example of publicExamples) {
  test(`${example.title} (${example.fileName}) installs, persists offline, and opens`, async ({ page }) => {
    test.slow();
    await page.goto("/content-packs?view=import");
    await page.getByLabel("Choose a question pack").setInputFiles(resolve(publicDirectory, example.fileName));
    await expect(page.getByTestId("question-pack-preview")).toContainText(example.title);
    await page.getByRole("checkbox", { name: /I reviewed the answer keys/ }).check();
    await page.getByRole("button", { name: "Install Pack" }).click();
    await expect(page.getByText("Question pack installed on this device.", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Installed", exact: true }).click();

    let card = page.getByTestId(`question-pack-${example.id}`);
    await expect(card).toBeVisible();
    await expect.poll(
      () => page.evaluate(async () => (await navigator.serviceWorker.getRegistration("/")) !== undefined),
      { timeout: 10_000 }
    ).toBe(true);
    await page.evaluate(async () => navigator.serviceWorker.ready.then(() => undefined));
    await page.reload();
    await openContentPacks(page);
    card = page.getByTestId(`question-pack-${example.id}`);
    await expect(card).toBeVisible();

    await page.context().setOffline(true);
    try {
      await page.reload();
      await openContentPacks(page);
      card = page.getByTestId(`question-pack-${example.id}`);
      await expect(card).toBeVisible();
      await openRuntime(page, card, example.kind);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    } finally {
      await page.context().setOffline(false);
    }
  });
}

async function openContentPacks(page: Page): Promise<void> {
  const installed = page.getByRole("link", { name: "Installed", exact: true });
  if ((await installed.getAttribute("aria-current")) !== "page") await installed.click();
}

async function openRuntime(page: Page, card: Locator, kind: PublicExample["kind"]): Promise<void> {
  if (kind === "fixed_numeric" || kind === "generated_template") {
    await card.getByRole("link", { name: /^Practice / }).first().click();
    await expect(page).toHaveURL(/\/drills\/session\/?(?:\?|$)/);
    return;
  }
  const names = {
    benchmark: "Open Benchmarks",
    case_practice: "Open Case practice",
    exhibit: "Open Exhibits",
    market_sizing: "Open Market sizing"
  } as const;
  await card.getByRole("link", { name: names[kind] }).click();
  const routes = {
    benchmark: "/benchmark",
    case_practice: "/case-practice",
    exhibit: "/exhibits",
    market_sizing: "/market-sizing"
  } as const;
  await expect(page).toHaveURL(new RegExp(`${routes[kind].replace("/", "\\/")}\\/?(?:\\?|$)`));
}
