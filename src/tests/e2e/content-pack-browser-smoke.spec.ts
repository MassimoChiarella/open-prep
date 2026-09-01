import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

test(
  "a bundled public question pack installs and opens for practice",
  { tag: "@browser-smoke" },
  async ({ page }) => {
    await page.goto("/content-packs/?view=import");
    await page
      .getByLabel("Choose a question pack")
      .setInputFiles(resolve(process.cwd(), "public", "question-pack-example.mathdrill.json"));
    await expect(page.getByTestId("question-pack-preview")).toContainText("Example Retail Practice");

    await page.getByRole("checkbox", { name: /I reviewed the answer keys/ }).check();
    await page.getByRole("button", { name: "Install Pack" }).click();
    await expect(page.getByText("Question pack installed on this device.", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Installed", exact: true }).click();
    const installedPack = page.getByTestId("question-pack-example-retail-practice");
    await expect(installedPack).toContainText("Example Retail Practice");
    await installedPack.getByRole("link", { name: "Practice beginner (1)" }).click();

    await expect(page).toHaveURL(/\/drills\/session\/(?:\?|$)/u);
    await expect(page.getByTestId("active-question-prompt")).toBeVisible();
  }
);
