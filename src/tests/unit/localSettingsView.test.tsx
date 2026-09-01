import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDrillSettings } from "@/features/drills/drillSettings";
import { localePreferenceStorageKey } from "@/features/i18n/i18n";
import { createCompleteBackupFromStorage } from "@/features/settings/completeBackupStorage";
import { LocalSettingsView } from "@/features/settings/LocalSettingsView";
import { themePreferenceStorageKey } from "@/features/theme/theme";
import { timingAccommodationPreferenceKey } from "@/features/timing/timingAccommodationPreference";
import { appStoreNames } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("LocalSettingsView", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/settings");
    window.localStorage.clear();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });

  afterEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window.navigator, "storage", { configurable: true, value: undefined });
    vi.restoreAllMocks();
  });

  it("keeps saved preferences primary and explains that drill edits are launch-specific", async () => {
    const storage = new MemoryAppStorage();

    render(<LocalSettingsView storageFactory={() => storage} />);

    const appearance = screen.getByTestId("settings-appearance");
    const preferences = screen.getByTestId("settings-preferences");

    expect(within(appearance).getByRole("heading", { name: "Appearance" })).toBeInTheDocument();
    expect(within(appearance).getByRole("combobox", { name: "Theme" })).toHaveValue("system");
    expect(await within(preferences).findByText(/Setup changes affect one launch/)).toBeInTheDocument();
    expect(within(preferences).getByRole("link", { name: "Open Drill Setup" })).toHaveAttribute("href", "/drills");
    expect(within(preferences).getByText("Language coverage")).toBeInTheDocument();
    expect(within(preferences).getByText(/Bundled practice questions/)).toBeInTheDocument();
    expect(appearance.compareDocumentPosition(preferences) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    for (const testId of ["settings-local-data", "settings-content-packs", "settings-offline", "settings-reset"]) {
      const disclosure = screen.getByTestId(testId);

      expect(disclosure).not.toHaveAttribute("open");
      expect(preferences.compareDocumentPosition(disclosure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }

    const contentPacks = screen.getByTestId("settings-content-packs");
    expect(within(contentPacks).queryByTestId("question-pack-pool-settings")).not.toBeInTheDocument();
    expect(within(contentPacks).getByRole("link", { name: "Open Content Packs" })).toHaveAttribute(
      "href",
      "/content-packs?view=installed"
    );
    openDisclosure("settings-content-packs");
    expect(await within(contentPacks).findByTestId("question-pack-pool-settings")).toBeInTheDocument();
  });

  it("opens and mounts question-pool settings when addressed by its hash", async () => {
    window.history.replaceState(null, "", "/settings#question-pool-settings");

    render(<LocalSettingsView storageFactory={() => new MemoryAppStorage()} />);

    const contentPacks = screen.getByTestId("settings-content-packs");
    expect(contentPacks).toHaveAttribute("id", "question-pool-settings");
    expect(contentPacks).toHaveAttribute("open");
    expect(await within(contentPacks).findByTestId("question-pack-pool-settings")).toBeInTheDocument();
  });

  it("opens and mounts question-pool settings after a hash change", async () => {
    render(<LocalSettingsView storageFactory={() => new MemoryAppStorage()} />);

    const contentPacks = screen.getByTestId("settings-content-packs");
    expect(contentPacks).not.toHaveAttribute("open");
    expect(within(contentPacks).queryByTestId("question-pack-pool-settings")).not.toBeInTheDocument();

    window.history.replaceState(null, "", "/settings#question-pool-settings");
    fireEvent(window, new HashChangeEvent("hashchange"));

    expect(contentPacks).toHaveAttribute("open");
    expect(await within(contentPacks).findByTestId("question-pack-pool-settings")).toBeInTheDocument();
  });

  it("keeps standard export private by default and preserves import and reset confirmations", async () => {
    const storage = new MemoryAppStorage();

    render(<LocalSettingsView storageFactory={() => storage} />);
    await screen.findByText(/Built-in defaults initialize/);

    const localData = openDisclosure("settings-local-data");
    const importConfirmation = within(localData).getByLabelText(
      "I understand this replaces local progress on this device."
    );

    expect(localData).toHaveTextContent(
      "Private stories, preparation profiles, notes, preferences, and installed packs are excluded."
    );
    expect(within(localData).getByRole("heading", { name: "Complete Backup" })).toBeInTheDocument();
    expect(importConfirmation).toBeDisabled();
    expect(within(localData).getByRole("button", { name: "Import And Replace" })).toBeDisabled();

    const reset = openDisclosure("settings-reset");
    const resetButton = within(reset).getByRole("button", { name: "Reset Local Data" });

    expect(reset).toHaveTextContent("drill defaults and presets");
    expect(reset).toHaveTextContent("mistake and review schedules");
    expect(reset).toHaveTextContent("case-practice attempts, preparation profiles, and saved fit stories");
    expect(resetButton).toBeDisabled();
    fireEvent.click(
      within(reset).getByLabelText("I understand this clears local practice data on this device.")
    );
    expect(resetButton).toBeEnabled();
  });

  it("requests persistent storage only from the explicit action", async () => {
    const persisted = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    const persist = vi.fn().mockResolvedValue(true);
    Object.defineProperty(window.navigator, "storage", {
      configurable: true,
      value: { persist, persisted }
    });

    render(<LocalSettingsView storageFactory={() => new MemoryAppStorage()} />);
    const localData = openDisclosure("settings-local-data");

    expect(await within(localData).findByText("Best-effort storage")).toBeInTheDocument();
    expect(persist).not.toHaveBeenCalled();
    fireEvent.click(within(localData).getByRole("button", { name: "Protect Local Data" }));

    expect(await within(localData).findByText("Persistent storage")).toBeInTheDocument();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(localData).toHaveTextContent("cannot protect against clearing site data");
  });

  it("previews and clears only personal text after explicit confirmation", async () => {
    const storage = new MemoryAppStorage();
    await seedPersonalData(storage);
    await storage.put("practice_records", {
      completedAt: "2026-08-31T12:00:00.000Z",
      id: "practice-attempt-1",
      itemId: "case-1",
      kind: "attempt",
      maxScore: 10,
      module: "structuring",
      score: 8
    });
    await storage.put("question_packs", questionPack());
    window.localStorage.setItem(localePreferenceStorageKey, "fr");

    render(<LocalSettingsView storageFactory={() => storage} />);
    const reset = openDisclosure("settings-reset");
    const personal = within(reset).getByTestId("settings-personal-clear");
    expect(await within(personal).findByText("Fit stories")).toBeInTheDocument();
    expect(personal).toHaveTextContent("Fit stories1");
    expect(personal).toHaveTextContent("Preparation profiles1");
    expect(personal).toHaveTextContent("Saved notes1");
    expect(personal).toHaveTextContent("Practice attempts, scores, installed packs, and preferences remain.");
    expect(within(personal).getByRole("link", { name: "Review Complete Backup options" }))
      .toHaveAttribute("href", "#complete-backup-heading");

    const clearButton = within(personal).getByRole("button", { name: "Clear Personal Data" });
    expect(clearButton).toBeDisabled();
    fireEvent.click(within(personal).getByLabelText("I understand this removes only the personal text listed above."));
    fireEvent.click(clearButton);

    expect(await within(personal).findByText("Personal data cleared.")).toBeInTheDocument();
    expect(await storage.getAll("practice_records")).toEqual([
      expect.objectContaining({ id: "practice-attempt-1", kind: "attempt" })
    ]);
    expect((await storage.getAll("market_sizing_attempts"))[0]).not.toHaveProperty("note");
    expect(await storage.getAll("question_packs")).toEqual([questionPack()]);
    expect(window.localStorage.getItem(localePreferenceStorageKey)).toBe("fr");
  });

  it("keeps all-data clear distinct, previews every scope, and removes stores and preferences", async () => {
    const storage = new MemoryAppStorage();
    await seedPersonalData(storage);
    await storage.put("question_packs", questionPack());
    window.localStorage.setItem(localePreferenceStorageKey, "fr");
    window.localStorage.setItem(themePreferenceStorageKey, "dark");
    window.localStorage.setItem(timingAccommodationPreferenceKey, "double_time");

    render(<LocalSettingsView storageFactory={() => storage} />);
    const reset = openDisclosure("settings-reset");
    const allData = within(reset).getByTestId("settings-all-data-clear");

    expect(await within(allData).findByText("IndexedDB records")).toBeInTheDocument();
    expect(allData).toHaveTextContent("5 records");
    expect(allData).toHaveTextContent("Personal items3 items");
    expect(allData).toHaveTextContent("Installed packs1 items");
    expect(allData).toHaveTextContent("Saved preferences3 items");
    expect(within(allData).getByRole("link", { name: "Review Complete Backup before clearing" }))
      .toHaveAttribute("href", "#complete-backup-heading");
    expect(within(reset).getByRole("button", { name: "Clear Personal Data" })).toBeInTheDocument();
    expect(within(reset).getByRole("button", { name: "Reset Local Data" })).toBeInTheDocument();

    const clear = within(allData).getByRole("button", { name: "Clear All Saved App Data" });
    expect(clear).toBeDisabled();
    fireEvent.click(within(allData).getByLabelText("I understand this clears all saved app data from this browser."));
    fireEvent.click(clear);

    expect(await within(allData).findByText("All saved app data cleared.")).toBeInTheDocument();
    for (const storeName of appStoreNames) expect(await storage.count(storeName)).toBe(0);
    expect(window.localStorage.getItem(localePreferenceStorageKey)).toBeNull();
    expect(window.localStorage.getItem(themePreferenceStorageKey)).toBeNull();
    expect(window.localStorage.getItem(timingAccommodationPreferenceKey)).toBeNull();
  });

  it("previews selected complete-backup scopes before enabling a cleartext download", async () => {
    const storage = new MemoryAppStorage();
    await seedPersonalData(storage);
    await storage.put("question_packs", questionPack());
    window.localStorage.setItem(localePreferenceStorageKey, "fr");
    window.localStorage.setItem(themePreferenceStorageKey, "dark");
    window.localStorage.setItem(timingAccommodationPreferenceKey, "time_and_a_half");

    render(<LocalSettingsView storageFactory={() => storage} />);
    const localData = openDisclosure("settings-local-data");
    fireEvent.click(within(localData).getByLabelText("Include private stories, preparation profile, and notes"));
    fireEvent.click(within(localData).getByLabelText("Include installed content packs"));
    fireEvent.click(within(localData).getByLabelText("Include locale, theme, timing, and question-pool preferences"));
    fireEvent.click(within(localData).getByRole("button", { name: "Prepare Complete Backup" }));

    const preview = await within(localData).findByTestId("complete-backup-export-preview");
    expect(preview).toHaveTextContent("4 records");
    expect(preview).toHaveTextContent("3 items");
    expect(preview).toHaveTextContent("Preferences included");
    expect(preview).toHaveTextContent("Included");
    expect(preview).toHaveTextContent("Schema version");
    expect(preview).toHaveTextContent("cleartext");

    const download = within(preview).getByRole("button", { name: "Download Complete Backup" });
    expect(download).toBeDisabled();
    fireEvent.click(within(preview).getByLabelText("I understand this download contains the selected cleartext data."));
    fireEvent.click(download);

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(await within(localData).findByText("Complete backup downloaded.")).toBeInTheDocument();
  });

  it("previews and restores a compatible complete backup after confirmation", async () => {
    const source = new MemoryAppStorage();
    await seedPersonalData(source);
    await source.put("question_packs", questionPack());
    window.localStorage.setItem(localePreferenceStorageKey, "fr");
    window.localStorage.setItem(themePreferenceStorageKey, "dark");
    window.localStorage.setItem(timingAccommodationPreferenceKey, "double_time");
    const backup = await createCompleteBackupFromStorage(source, {
      exportedAt: "2026-08-31T12:00:00.000Z",
      selectedOptionalScopes: ["private_text", "packs", "preferences"]
    });
    const file = testFile(JSON.stringify(backup), "backup.json");
    const target = new MemoryAppStorage();
    await target.put("question_packs", { ...questionPack(), id: "old-pack" });
    window.localStorage.clear();

    render(<LocalSettingsView storageFactory={() => target} />);
    const localData = openDisclosure("settings-local-data");
    fireEvent.change(within(localData).getByLabelText("Choose a complete backup file"), {
      target: { files: [file] }
    });

    const preview = await within(localData).findByTestId("complete-backup-restore-preview");
    expect(preview).toHaveTextContent("Compatible app and schema");
    expect(preview).toHaveTextContent("1 items");
    const restore = within(preview).getByRole("button", { name: "Restore Selected Sections" });
    expect(restore).toBeDisabled();
    fireEvent.click(within(preview).getByLabelText("I understand the selected sections will be replaced on this device."));
    fireEvent.click(restore);

    expect(await within(localData).findByText("Complete backup restored.")).toBeInTheDocument();
    expect(await target.getAll("practice_records")).toHaveLength(2);
    expect((await target.getAll("question_packs"))[0]?.id).toBe("pack-1");
    expect(window.localStorage.getItem(localePreferenceStorageKey)).toBe("fr");
    expect(window.localStorage.getItem(themePreferenceStorageKey)).toBe("dark");
    expect(window.localStorage.getItem(timingAccommodationPreferenceKey)).toBe("double_time");
  });

  it("rejects an invalid complete backup without enabling restore", async () => {
    render(<LocalSettingsView storageFactory={() => new MemoryAppStorage()} />);
    const localData = openDisclosure("settings-local-data");
    const file = testFile("not-json", "bad.json");

    fireEvent.change(within(localData).getByLabelText("Choose a complete backup file"), {
      target: { files: [file] }
    });

    expect(await within(localData).findByText("Incompatible or invalid backup")).toBeInTheDocument();
    expect(localData).toHaveTextContent("Complete backup must contain valid JSON.");
    expect(within(localData).queryByRole("button", { name: "Restore Selected Sections" })).not.toBeInTheDocument();
  });
});

function openDisclosure(testId: string): HTMLElement {
  const disclosure = screen.getByTestId(testId) as HTMLDetailsElement;

  fireEvent.click(disclosure.querySelector("summary") as HTMLElement);
  expect(disclosure.open).toBe(true);

  return disclosure;
}

async function seedPersonalData(storage: MemoryAppStorage): Promise<void> {
  await storage.put("practice_records", {
    action: "I aligned the team.",
    competency: "leadership",
    id: "fit-story-1",
    kind: "fit_story",
    reflection: "I would delegate sooner.",
    result: "Delivery recovered.",
    situation: "Private client story",
    task: "Recover delivery.",
    title: "Leadership story",
    updatedAt: "2026-08-31T12:00:00.000Z"
  });
  await storage.put("practice_records", {
    experienceLevel: "intermediate",
    id: "prep-profile",
    kind: "prep_profile",
    targetFirms: ["Firm A"],
    updatedAt: "2026-08-31T12:00:00.000Z",
    weeklySessions: 4
  });
  await storage.put("market_sizing_attempts", {
    id: "market-1",
    note: "Private note",
    startedAt: "2026-08-31T12:00:00.000Z",
    templateId: "market-template-1"
  });
  await storage.put("user_settings", {
    id: "default",
    settings: createDrillSettings({ questionCount: 5 }),
    updatedAt: "2026-08-31T12:00:00.000Z"
  });
}

function questionPack() {
  return {
    format: "math-drill-question-pack" as const,
    id: "pack-1",
    importedAt: "2026-08-31T12:00:00.000Z",
    kind: "fixed_numeric" as const,
    packVersion: "1.0.0",
    questions: [{
      answer: { tolerance: { type: "absolute" as const, value: 0 }, unit: "none" as const, value: 10 },
      category: "arithmetic" as const,
      difficulty: "beginner" as const,
      explanation: { short: "Add the values.", steps: ["Four plus six is ten."] },
      id: "addition-1",
      prompt: "What is 4 + 6?",
      tags: ["addition" as const],
      type: "numeric" as const
    }],
    schemaVersion: 2 as const,
    title: "Pack 1"
  };
}

function testFile(contents: string, name: string): File {
  const file = new File([contents], name, { type: "application/json" });
  Object.defineProperty(file, "text", { value: async () => contents });
  return file;
}
