"use client";

import { useEffect, useMemo, useState } from "react";

import { LocalSaveNotice } from "@/components/LocalSaveNotice";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  readQuestionPackPoolPreference,
  writeQuestionPackPoolPreference,
  type QuestionPackPoolMode,
  type QuestionPackPoolPreference
} from "@/features/question-packs/questionPackPoolPreference";
import type { AppStorage, QuestionPackRecord } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

type LoadStatus = "error" | "loading" | "ready";
type SaveStatus = "error" | "idle" | "saved" | "saving";
type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

const modeOptions: Array<{
  description: string;
  label: string;
  value: QuestionPackPoolMode;
}> = [
  {
    description: "Use the app's built-in practice content.",
    label: "Built-in content only",
    value: "built_in_only"
  },
  {
    description: "Mix selected packs with the app's built-in practice content.",
    label: "Built-in and selected packs",
    value: "built_in_and_selected"
  },
  {
    description: "Use only selected installed packs in matching practice areas.",
    label: "Selected packs only",
    value: "selected_only"
  }
];

export function QuestionPackPoolSettings({
  preferenceStorage,
  storageFactory = createIndexedDbAppStorage
}: {
  preferenceStorage?: PreferenceStorage;
  storageFactory?: () => AppStorage;
} = {}) {
  const { formatNumber, t } = useI18n();
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [packs, setPacks] = useState<QuestionPackRecord[]>([]);
  const [preference, setPreference] = useState<QuestionPackPoolPreference>(() =>
    readQuestionPackPoolPreference(preferenceStorage)
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    let cancelled = false;
    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      void storage.getAll("question_packs")
        .then((installedPacks) => {
          if (!cancelled) {
            setPacks(
              installedPacks.sort(
                (left, right) => right.importedAt.localeCompare(left.importedAt) || left.id.localeCompare(right.id)
              )
            );
            setLoadStatus("ready");
          }
        })
        .catch(() => {
          if (!cancelled) setLoadStatus("error");
        })
        .finally(() => storage?.close());
    } catch {
      void Promise.resolve().then(() => {
        if (!cancelled) setLoadStatus("error");
      });
    }

    return () => {
      cancelled = true;
      storage?.close();
    };
  }, [storageFactory]);

  const selectedIds = useMemo(() => new Set(preference.selectedPackIds), [preference.selectedPackIds]);
  const installedIds = useMemo(() => new Set(packs.map(({ id }) => id)), [packs]);
  const selectedInstalledCount = packs.filter(({ id }) => selectedIds.has(id)).length;
  const unavailableCount = preference.selectedPackIds.filter((id) => !installedIds.has(id)).length;
  const selectedOnlyBlocked = preference.mode === "selected_only" && selectedInstalledCount === 0;

  function updateMode(mode: QuestionPackPoolMode) {
    setPreference((current) => ({ ...current, mode }));
    setSaveStatus("idle");
  }

  function togglePack(packId: string) {
    setPreference((current) => ({
      ...current,
      selectedPackIds: current.selectedPackIds.includes(packId)
        ? current.selectedPackIds.filter((id) => id !== packId)
        : [...current.selectedPackIds, packId]
    }));
    setSaveStatus("idle");
  }

  function handleSave() {
    if (selectedOnlyBlocked) return;
    setSaveStatus("saving");

    try {
      const savedPreference = loadStatus === "ready"
        ? {
            ...preference,
            selectedPackIds: preference.selectedPackIds.filter((id) => installedIds.has(id))
          }
        : preference;
      writeQuestionPackPoolPreference(savedPreference, preferenceStorage);
      setPreference(readQuestionPackPoolPreference(preferenceStorage));
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }

  return (
    <section className="grid w-full gap-4" data-testid="question-pack-pool-settings">
      <div>
        <h3 className="text-base font-semibold text-ink">{t("Question pool")}</h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/70">
          {t("Choose whether installed packs supplement or replace built-in content in matching practice areas.")}
        </p>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold text-ink">{t("Content source")}</legend>
        {modeOptions.map((option) => (
          <label
            className="grid min-h-11 cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2 border border-ink/15 bg-white px-3 py-3 has-[:checked]:border-teal has-[:checked]:bg-mint/40"
            key={option.value}
          >
            <input
              checked={preference.mode === option.value}
              className="mt-1 h-4 w-4 accent-teal"
              name="question-pack-pool-mode"
              onChange={() => updateMode(option.value)}
              type="radio"
              value={option.value}
            />
            <span>
              <span className="block text-sm font-semibold text-ink">{t(option.label)}</span>
              <span className="mt-1 block text-xs leading-5 text-ink/65">{t(option.description)}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid gap-2">
        <p className="text-sm font-semibold text-ink">{t("Choose installed packs")}</p>
        {loadStatus === "loading" ? (
          <p className="text-sm text-ink/65">{t("Loading packs...")}</p>
        ) : null}
        {loadStatus === "error" ? (
          <LocalSaveNotice
            detail={t("Installed question packs are unavailable.")}
            label={t("Question packs")}
            tone="error"
          />
        ) : null}
        {loadStatus === "ready" && packs.length === 0 ? (
          <p className="border-s-2 border-ink/15 bg-paper px-3 py-2 text-sm text-ink/65">
            {t("No question packs installed.")}
          </p>
        ) : null}
        {loadStatus === "ready" && packs.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {packs.map((pack) => (
              <label
                className="grid min-h-11 cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2 border border-ink/15 bg-white px-3 py-3 has-[:checked]:border-coral has-[:checked]:bg-coral/10"
                key={pack.id}
              >
                <input
                  checked={selectedIds.has(pack.id)}
                  className="mt-1 h-4 w-4 accent-coral"
                  onChange={() => togglePack(pack.id)}
                  type="checkbox"
                />
                <span className="min-w-0">
                  <span className="block break-words text-sm font-semibold text-ink">{pack.title}</span>
                  <span className="mt-1 block text-xs capitalize text-ink/65">
                    {pack.kind.replaceAll("_", " ")} · v{pack.packVersion}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : null}
        {unavailableCount > 0 && loadStatus === "ready" ? (
          <p className="text-xs leading-5 text-ink/65">
            {t("{count} selected pack IDs are not installed on this device and will be removed when you save.", {
              count: formatNumber(unavailableCount)
            })}
          </p>
        ) : null}
      </div>

      {selectedOnlyBlocked && loadStatus === "ready" ? (
        <p className="border border-coral/30 border-s-2 border-s-coral bg-coral/10 px-3 py-2 text-sm text-ink" role="alert">
          {t("Select at least one installed pack before saving selected-packs-only mode.")}
        </p>
      ) : null}

      <button
        className="inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-teal px-4 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/30"
        disabled={saveStatus === "saving" || selectedOnlyBlocked}
        onClick={handleSave}
        type="button"
      >
        {t(saveStatus === "saving" ? "Saving..." : "Save Question Pool")}
      </button>

      {saveStatus === "saved" ? (
        <LocalSaveNotice detail={t("Question pool saved on this device.")} label={t("Question pool")} />
      ) : null}
      {saveStatus === "error" ? (
        <LocalSaveNotice
          detail={t("Question pool could not be saved on this device.")}
          label={t("Question pool")}
          tone="error"
        />
      ) : null}
    </section>
  );
}
