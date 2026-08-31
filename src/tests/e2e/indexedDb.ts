import type { Page } from "@playwright/test";

import { appDatabaseName } from "../../lib/storage/appStorageTypes";

export async function deleteAppDatabase(page: Page): Promise<void> {
  await Promise.all(
    page.context().pages()
      .filter((candidate) => candidate !== page)
      .map((candidate) => candidate.close())
  );
  await page.goto("/manifest.webmanifest");

  await page.evaluate((databaseName) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName);
    const location = window.location.href;

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(
      `IndexedDB deletion failed for "${databaseName}" at ${location}: ${request.error?.name ?? "unknown error"} - ${request.error?.message ?? "no diagnostic detail"}`
    ));
    request.onblocked = () => reject(new Error(
      `IndexedDB deletion was blocked for "${databaseName}" at ${location}; an application connection is still open.`
    ));
  }), appDatabaseName);
}
