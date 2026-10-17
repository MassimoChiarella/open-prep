import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

test("@browser-smoke stale pack installation requires renewed replacement consent", async ({ context, page }) => {
  const other = await context.newPage();
  const starter = JSON.parse(readFileSync("public/question-pack-starter.mathdrill.json", "utf8")) as Record<string, unknown>;
  for (const [tab, publisher] of [[page, "First publisher"], [other, "Other publisher"]] as const) {
    await tab.goto("/content-packs/?view=import");
    const payload = { ...starter, id: "concurrent-pack-review", title: publisher, publisher };
    await tab.getByLabel("Choose a question pack", { exact: true }).setInputFiles({
      name: "concurrent.mathdrill.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(payload))
    });
    await expect(tab.getByTestId("question-pack-review-confirmation")).toBeEnabled();
    await tab.getByTestId("question-pack-review-confirmation").check();
    await expect(tab.getByRole("button", { name: "Install Pack", exact: true })).toBeEnabled();
  }
  await other.getByRole("button", { name: "Install Pack", exact: true }).click();
  await expect.poll(() => storedPublisher(other)).toBe("Other publisher");
  await page.getByRole("button", { name: "Install Pack", exact: true }).click();
  await expect(page.getByText("The installed pack changed in another tab. Review it again before replacing.", { exact: true })).toBeVisible();
  expect(await storedPublisher(page)).toBe("Other publisher");
  await expect(page.getByTestId("question-pack-review-confirmation")).not.toBeChecked();
  const replace = page.getByRole("button", { name: "Replace Pack", exact: true });
  await expect(replace).toBeDisabled();
  await expect(page.getByTestId("question-pack-preview")).toContainText("Other publisher (v1.0)");
  await page.getByTestId("question-pack-review-confirmation").check();
  await replace.click();
  await expect.poll(() => storedPublisher(page)).toBe("First publisher");
});

function storedPublisher(page: Page) {
  return page.evaluate(() => new Promise<string | undefined>((resolve, reject) => {
    const opening = indexedDB.open("consulting_math_drill_tool");
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const database = opening.result;
      const transaction = database.transaction("question_packs", "readonly");
      const request = transaction.objectStore("question_packs").get("concurrent-pack-review");
      transaction.oncomplete = () => { database.close(); resolve(request.result?.publisher); };
      transaction.onabort = transaction.onerror = () => { database.close(); reject(transaction.error); };
    };
  }));
}
