import { expect, test } from "@playwright/test";

test("complete backup preparation and download work with the bundled worker offline", async ({ context, page }) => {
  await page.goto("/settings/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.getByTestId("settings-local-data").locator("summary").click();
  const workerCreated = page.waitForEvent("worker");
  await page.getByRole("button", { name: "Prepare Complete Backup", exact: true }).click();
  const worker = await workerCreated;
  expect(new URL(worker.url()).origin).toBe(new URL(page.url()).origin);
  const preview = page.getByTestId("complete-backup-export-preview");
  await expect(preview).toBeVisible();
  await preview.getByRole("checkbox").check();
  const downloadEvent = page.waitForEvent("download");
  await preview.getByRole("button", { name: "Download Complete Backup" }).click();
  const download = await downloadEvent;
  const stream = await download.createReadStream();
  if (stream === null) throw new Error("Prepared backup download was unavailable.");
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const backup = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  expect(backup.format).toBe("open-prep-complete-backup");
  expect(backup.selectedScopes).toEqual(["progress"]);
  expect(backup.checksum.algorithm).toBe("SHA-256");
});

test("canceling or changing scopes terminates preparation before accepting a late result", async ({ page }) => {
  await page.addInitScript(() => {
    window.Worker = new Proxy(window.Worker, {
      construct(Target, args) {
        const worker: Worker = Reflect.construct(Target, args);
        if (args[1]?.name === "complete-backup-preparation") {
          const post = worker.postMessage.bind(worker);
          worker.postMessage = (message: unknown) => {
            Object.assign(window, { releaseBackupPreparation: () => post(message) });
          };
        }
        return worker;
      }
    });
  });
  await page.goto("/settings/");
  await page.getByTestId("settings-local-data").locator("summary").click();
  const prepare = page.getByRole("button", { name: "Prepare Complete Backup", exact: true });
  await prepare.click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(prepare).toBeEnabled();
  await page.evaluate(() => (window as Window & { releaseBackupPreparation?: () => void }).releaseBackupPreparation?.());
  await expect(page.getByTestId("complete-backup-export-preview")).toHaveCount(0);
  await prepare.click();
  await page.getByRole("checkbox", { name: "Include private stories, preparation profile, full-case drafts, and notes" }).check();
  await expect(prepare).toBeEnabled();
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(0);
  await page.evaluate(() => (window as Window & { releaseBackupPreparation?: () => void }).releaseBackupPreparation?.());
  await expect(page.getByTestId("complete-backup-export-preview")).toHaveCount(0);
});
