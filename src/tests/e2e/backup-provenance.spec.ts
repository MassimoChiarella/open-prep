import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

import { validateQuestionPackPayload } from "@/features/question-packs/questionPack";
import { serializeCompleteBackup } from "@/features/settings/completeBackup";
import { createCompleteBackupFromStorage } from "@/features/settings/completeBackupStorage";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

test("@browser-smoke restored content cannot assert repository review through backup metadata", async ({ page }) => {
  const timestamp = "2026-10-17T12:00:00.000Z";
  const payload = JSON.parse(readFileSync("public/question-pack-starter.mathdrill.json", "utf8"));
  const validation = validateQuestionPackPayload({ ...payload, id: "unverified-restored-pack", title: "Restored original content" }, timestamp);
  if (validation.status === "invalid") throw new Error(validation.errors.join("\n"));
  const source = new MemoryAppStorage();
  await source.put("question_packs", { ...validation.pack, catalogProvenance: {
    source: "repository_catalog", id: validation.pack.id, version: validation.pack.packVersion, publisherId: "invented-publisher",
    file: "/community-packs/invented/1.0/pack.mathdrill.json", reviewDate: timestamp, sha256: "f".repeat(64)
  } });
  const backup = await createCompleteBackupFromStorage(source, { exportedAt: timestamp, selectedOptionalScopes: ["packs"] });
  expect(backup.sections.packs![0].catalogProvenance).toBeDefined();
  await page.goto("/settings/");
  await expect(page.getByText(/Built-in defaults initialize Drill Selection/)).toBeVisible();
  await page.getByTestId("settings-local-data").locator(":scope > summary").click();
  await expect(page.getByText("Repository review claims in backups are not verified. Restored packs are unreviewed; install them from the catalog to verify their review status.", { exact: true })).toBeVisible();
  await page.getByLabel("Choose a complete backup file", { exact: true }).setInputFiles({
    name: "unverified-review.json", mimeType: "application/json", buffer: Buffer.from(serializeCompleteBackup(backup))
  });
  await expect(page.getByTestId("complete-backup-restore-preview")).toBeVisible();
  await page.getByLabel("I understand the selected sections will be replaced on this device.", { exact: true }).check();
  const origin = new URL(page.url()).origin;
  await page.getByRole("button", { name: "Restore Selected Sections", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/`);
  await page.goto("/content-packs/?view=installed");
  const card = page.getByTestId("question-pack-unverified-restored-pack");
  await expect(card.getByRole("heading", { name: "Restored original content", exact: true })).toBeVisible();
  await expect(card.getByText("Repository reviewed", { exact: true })).toHaveCount(0);
  await expect(card.getByRole("link", { name: "Practice beginner (1)", exact: true })).toBeVisible();
});
