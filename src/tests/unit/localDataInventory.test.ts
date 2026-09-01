import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  completeBackupLimits,
  completeBackupStoreNames,
  localDataInvalidationKinds,
  localPreferenceKeys
} from "@/features/settings/localDataInventory";
import { appStoreNames } from "@/lib/storage/appStorageTypes";

describe("local data inventory contract", () => {
  it("covers every IndexedDB store", () => {
    expect(completeBackupStoreNames).toEqual(appStoreNames);
  });

  it("freezes explicit preferences, limits, and invalidation messages", () => {
    expect(localPreferenceKeys).toEqual([
      "consulting_math_locale_preference",
      "consulting_math_theme_preference",
      "open_prep_timing_accommodation",
      "open_prep_question_pack_pool"
    ]);
    expect(completeBackupLimits.maxQuestionPacks).toBe(200);
    expect(completeBackupLimits.maxFileBytes).toBe(40 * 1024 * 1024);
    expect(localDataInvalidationKinds).toEqual(["personal_data_cleared", "all_data_cleared"]);
  });

  it("documents every store, preference, exclusion, backup scope, and clear scope", () => {
    const document = readFileSync(resolve("LOCAL_DATA_INVENTORY.md"), "utf8");

    for (const storeName of appStoreNames) expect(document).toContain(`\`${storeName}\``);
    for (const key of localPreferenceKeys) expect(document).toContain(`\`${key}\``);
    for (const phrase of [
      "Private Text",
      "Installed Packs",
      "Preferences",
      "Personal Data",
      "Reset Practice Progress",
      "Clear All Saved App Data",
      "readable cleartext",
      "never backed up",
      "failed mutation sends no success message"
    ]) expect(document).toContain(phrase);
  });
});
