"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useState } from "react";

import { LocalSaveNotice } from "@/components/LocalSaveNotice";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentConnectionState } from "@/features/offline/OfflineStatusIndicator";
import { localePreferenceStorageKey } from "@/features/i18n/i18n";
import { useI18n } from "@/features/i18n/I18nProvider";
import { QuestionPackPoolSettings } from "@/features/question-packs/QuestionPackPoolSettings";
import { questionPackPoolPreferenceStorageKey } from "@/features/question-packs/questionPackPoolPreference";
import {
  serializeCompleteBackup,
  validateCompleteBackupPayload,
  type CompleteBackupV1
} from "@/features/settings/completeBackup";
import {
  buildCompleteBackupFileName,
  createCompleteBackupFromStorage,
  createCompleteBackupSummary,
  restoreCompleteBackup,
  type CompleteBackupSummary
} from "@/features/settings/completeBackupStorage";
import {
  clearAllSavedAppData,
  previewAllSavedAppData,
  type ClearAllSavedAppDataPreview
} from "@/features/settings/localDataClear";
import { publishLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import {
  completeBackupLimits,
  localPreferenceKeys,
  type CompleteBackupOptionalScope
} from "@/features/settings/localDataInventory";
import {
  buildLocalProgressExportFileName,
  createLocalProgressExport,
  createLocalProgressImportSummary,
  localProgressImportLimits,
  replaceLocalProgressWithImport,
  serializeLocalProgressExport,
  validateLocalProgressImportPayload,
  type LocalProgressExport,
  type LocalProgressImportSummary
} from "@/features/settings/localProgressExport";
import {
  clearPersonalData,
  previewPersonalDataClear,
  type PersonalDataClearPreview
} from "@/features/settings/personalDataClear";
import { loadUserDrillSettings, resetLocalData } from "@/features/settings/settingsPersistence";
import {
  queryStoragePersistence,
  requestStoragePersistence,
  type StoragePersistenceStatus
} from "@/features/settings/storagePersistence";
import { themePreferenceStorageKey } from "@/features/theme/theme";
import { ThemePreferenceSelect } from "@/features/theme/ThemePreferenceSelect";
import { timingAccommodationPreferenceKey } from "@/features/timing/timingAccommodationPreference";
import type { DrillSettings } from "@/lib/domain";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

type SettingsStatus = "error" | "loading" | "ready" | "reset" | "resetting";
type ExportStatus = "error" | "exported" | "exporting" | "idle";
type ImportStatus = "error" | "idle" | "imported" | "importing" | "invalid" | "ready";
type CompleteExportStatus = "downloaded" | "error" | "idle" | "prepared" | "preparing";
type CompleteRestoreStatus = "error" | "idle" | "invalid" | "partial" | "ready" | "restored" | "restoring";
type PersistenceUiStatus = "checking" | "requesting" | StoragePersistenceStatus;
type PersonalClearStatus = "cleared" | "clearing" | "error" | "loading" | "partial" | "ready";
type AllClearStatus = "cleared" | "clearing" | "error" | "loading" | "partial_invalidation" | "partial_preferences" | "ready";
type ConnectionState = ReturnType<typeof getCurrentConnectionState>;

interface PendingCompleteRestore {
  backup: CompleteBackupV1;
  sourceBytes: number;
}

const settingsPanelClass =
  "min-w-0 border border-ink/15 border-t-2 border-t-coral bg-white p-5 sm:p-6";
const settingsDetailsClass = `${settingsPanelClass} group grid gap-4`;
const settingsSummaryClass =
  "-m-2 flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 p-2 transition-colors marker:content-none hover:bg-paper/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal";
const uiSectionTitleClass = "text-lg font-semibold text-ink";
const confirmationLabelClass =
  "flex min-h-11 items-start gap-3 rounded-md border border-ink/15 px-3 py-2 text-sm font-medium leading-6 text-ink has-[:checked]:border-coral has-[:checked]:bg-coral/10";
const fileInputClass =
  "block min-h-11 w-full text-sm text-ink file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-white file:px-3 file:text-sm file:font-semibold file:text-ink";
const confirmationButtonClass =
  "inline-flex min-h-11 w-fit items-center justify-center rounded-md border border-coral bg-ink px-4 text-sm font-semibold text-paper enabled:hover:bg-teal disabled:cursor-not-allowed disabled:border-ink/30 disabled:bg-paper disabled:text-ink/70";

export function LocalSettingsView({
  storageFactory = createIndexedDbAppStorage
}: {
  storageFactory?: () => AppStorage;
} = {}) {
  const { formatNumber, t } = useI18n();
  const [allClearConfirmed, setAllClearConfirmed] = useState(false);
  const [allClearFailedPreferences, setAllClearFailedPreferences] = useState<string[]>([]);
  const [allClearPreview, setAllClearPreview] = useState<ClearAllSavedAppDataPreview>();
  const [allClearStatus, setAllClearStatus] = useState<AllClearStatus>("loading");
  const [completeExportConfirmed, setCompleteExportConfirmed] = useState(false);
  const [completeExportStatus, setCompleteExportStatus] = useState<CompleteExportStatus>("idle");
  const [completeRestoreConfirmed, setCompleteRestoreConfirmed] = useState(false);
  const [completeRestoreErrors, setCompleteRestoreErrors] = useState<string[]>([]);
  const [completeRestoreStatus, setCompleteRestoreStatus] = useState<CompleteRestoreStatus>("idle");
  const [connectionState, setConnectionState] = useState<ConnectionState>("online");
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [importConfirmed, setImportConfirmed] = useState(false);
  const [includeBackupPacks, setIncludeBackupPacks] = useState(false);
  const [includeBackupPreferences, setIncludeBackupPreferences] = useState(false);
  const [includeBackupPrivateText, setIncludeBackupPrivateText] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState<LocalProgressImportSummary | undefined>();
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [pendingImport, setPendingImport] = useState<LocalProgressExport | undefined>();
  const [pendingCompleteRestore, setPendingCompleteRestore] = useState<PendingCompleteRestore>();
  const [personalClearConfirmed, setPersonalClearConfirmed] = useState(false);
  const [personalClearPreview, setPersonalClearPreview] = useState<PersonalDataClearPreview>();
  const [personalClearStatus, setPersonalClearStatus] = useState<PersonalClearStatus>("loading");
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceUiStatus>("checking");
  const [preferenceRestoreFailures, setPreferenceRestoreFailures] = useState<string[]>([]);
  const [preparedCompleteBackup, setPreparedCompleteBackup] = useState<CompleteBackupV1>();
  const [questionPackPoolOpened, setQuestionPackPoolOpened] = useState(false);
  const [questionPackPoolRevision, setQuestionPackPoolRevision] = useState(0);
  const [savedSettings, setSavedSettings] = useState<DrillSettings | undefined>();
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const [status, setStatus] = useState<SettingsStatus>("loading");

  useEffect(() => {
    const openQuestionPoolSettings = () => {
      if (window.location.hash !== "#question-pool-settings") return;

      const disclosure = document.getElementById("question-pool-settings");
      if (disclosure instanceof HTMLDetailsElement) disclosure.open = true;
      setQuestionPackPoolOpened(true);
    };

    openQuestionPoolSettings();
    window.addEventListener("hashchange", openQuestionPoolSettings);

    return () => window.removeEventListener("hashchange", openQuestionPoolSettings);
  }, []);

  useEffect(() => {
    const updateConnectionState = () => setConnectionState(getCurrentConnectionState());

    updateConnectionState();
    window.addEventListener("online", updateConnectionState);
    window.addEventListener("offline", updateConnectionState);

    return () => {
      window.removeEventListener("online", updateConnectionState);
      window.removeEventListener("offline", updateConnectionState);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void queryStoragePersistence().then((nextStatus) => {
      if (!cancelled) setPersistenceStatus(nextStatus);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    try {
      const storage = storageFactory();

      void loadUserDrillSettings(storage)
        .then((settings) => {
          if (cancelled) {
            return;
          }

          setSavedSettings(settings);
          setStatus("ready");
        })
        .catch(() => {
          if (!cancelled) {
            setStatus("error");
          }
        })
        .finally(() => storage.close());
    } catch {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [storageFactory]);

  useEffect(() => {
    let cancelled = false;
    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      void Promise.all([
        previewPersonalDataClear(storage),
        previewAllSavedAppData(storage)
      ])
        .then(([personalPreview, completePreview]) => {
          if (cancelled) return;
          setAllClearPreview(completePreview);
          setAllClearStatus("ready");
          setPersonalClearPreview(personalPreview);
          setPersonalClearStatus("ready");
        })
        .catch(() => {
          if (!cancelled) {
            setAllClearStatus("error");
            setPersonalClearStatus("error");
          }
        })
        .finally(() => storage?.close());
    } catch {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setAllClearStatus("error");
          setPersonalClearStatus("error");
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [storageFactory]);

  function handleReset() {
    setStatus("resetting");

    try {
      const storage = storageFactory();

      void resetLocalData(storage)
        .then(() => {
          setSavedSettings(undefined);
          setResetConfirmed(false);
          setStatus("reset");
        })
        .catch(() => setStatus("error"))
        .finally(() => storage.close());
    } catch {
      setStatus("error");
    }
  }

  async function handleExport() {
    setExportStatus("exporting");

    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      const exported = await createLocalProgressExport(
        storage
      );

      downloadLocalProgressExport(exported);
      setExportStatus("exported");
    } catch {
      setExportStatus("error");
    } finally {
      storage?.close();
    }
  }

  async function handleProtectLocalData() {
    setPersistenceStatus("requesting");
    setPersistenceStatus(await requestStoragePersistence());
  }

  function selectedCompleteBackupScopes(): CompleteBackupOptionalScope[] {
    return [
      ...(includeBackupPrivateText ? ["private_text" as const] : []),
      ...(includeBackupPacks ? ["packs" as const] : []),
      ...(includeBackupPreferences ? ["preferences" as const] : [])
    ];
  }

  function updateCompleteBackupScope(update: () => void): void {
    update();
    setCompleteExportConfirmed(false);
    setCompleteExportStatus("idle");
    setPreparedCompleteBackup(undefined);
  }

  async function handlePrepareCompleteBackup() {
    setCompleteExportConfirmed(false);
    setCompleteExportStatus("preparing");
    setPreparedCompleteBackup(undefined);
    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      const backup = await createCompleteBackupFromStorage(storage, {
        selectedOptionalScopes: selectedCompleteBackupScopes()
      });
      setPreparedCompleteBackup(backup);
      setCompleteExportStatus("prepared");
    } catch {
      setCompleteExportStatus("error");
    } finally {
      storage?.close();
    }
  }

  function handleDownloadCompleteBackup() {
    if (preparedCompleteBackup === undefined || !completeExportConfirmed) return;

    downloadJson(
      serializeCompleteBackup(preparedCompleteBackup),
      buildCompleteBackupFileName(preparedCompleteBackup.exportedAt)
    );
    setCompleteExportStatus("downloaded");
  }

  async function handleCompleteBackupFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    setCompleteRestoreConfirmed(false);
    setCompleteRestoreErrors([]);
    setPendingCompleteRestore(undefined);
    setPreferenceRestoreFailures([]);

    if (file === undefined) {
      setCompleteRestoreStatus("idle");
      return;
    }
    if (file.size > completeBackupLimits.maxFileBytes) {
      setCompleteRestoreErrors([`Complete backup must be ${completeBackupLimits.maxFileBytes} bytes or smaller.`]);
      setCompleteRestoreStatus("invalid");
      return;
    }

    try {
      const parsed: unknown = JSON.parse(await file.text());
      const validation = await validateCompleteBackupPayload(parsed, { sourceBytes: file.size });

      if (validation.status === "invalid") {
        setCompleteRestoreErrors(validation.errors);
        setCompleteRestoreStatus("invalid");
        return;
      }

      setPendingCompleteRestore({ backup: validation.backup, sourceBytes: file.size });
      setCompleteRestoreStatus("ready");
    } catch {
      setCompleteRestoreErrors(["Complete backup must contain valid JSON."]);
      setCompleteRestoreStatus("invalid");
    }
  }

  async function handleCompleteRestore() {
    if (pendingCompleteRestore === undefined || !completeRestoreConfirmed) return;

    setCompleteRestoreStatus("restoring");
    setPreferenceRestoreFailures([]);
    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      const result = await restoreCompleteBackup(storage, pendingCompleteRestore.backup, {
        sourceBytes: pendingCompleteRestore.sourceBytes
      });
      setSavedSettings(result.backup.sections.progress.stores.user_settings[0]?.settings);
      setCompleteRestoreConfirmed(false);
      setPreferenceRestoreFailures(result.preferences.failedKeys);
      setCompleteRestoreStatus(result.preferences.status === "partial" ? "partial" : "restored");

      if (
        result.backup.sections.preferences !== undefined ||
        result.backup.selectedScopes.includes("packs")
      ) {
        setQuestionPackPoolRevision((current) => current + 1);
      }
      if (result.backup.sections.preferences !== undefined) {
        for (const key of localPreferenceKeys) {
          if (!result.preferences.failedKeys.includes(key)) {
            window.dispatchEvent(new StorageEvent("storage", {
              key,
              newValue: result.backup.sections.preferences[key]
            }));
          }
        }
      }
    } catch {
      setCompleteRestoreStatus("error");
    } finally {
      storage?.close();
    }
  }

  async function handlePersonalDataClear() {
    if (!personalClearConfirmed) return;

    setPersonalClearStatus("clearing");
    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      const cleared = await clearPersonalData(storage);
      const delivery = publishLocalDataInvalidation("personal_data_cleared");
      setPersonalClearConfirmed(false);
      setPersonalClearPreview({ fitStories: 0, marketSizingNotes: 0, preparationProfiles: 0, totalItems: 0 });
      setPersonalClearStatus(delivery === "unavailable" ? "partial" : "cleared");
      setAllClearPreview((current) => current === undefined ? current : {
        ...current,
        indexedDbRecords: Math.max(
          0,
          current.indexedDbRecords - cleared.fitStories - cleared.preparationProfiles
        ),
        personalItems: 0
      });
    } catch {
      setPersonalClearStatus("error");
    } finally {
      storage?.close();
    }
  }

  async function handleAllDataClear() {
    if (!allClearConfirmed) return;

    setAllClearFailedPreferences([]);
    setAllClearStatus("clearing");
    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      const result = await clearAllSavedAppData(storage);
      setAllClearConfirmed(false);
      setAllClearFailedPreferences(result.preferences.failedKeys);
      setAllClearPreview({
        indexedDbRecords: 0,
        installedPacks: 0,
        personalItems: 0,
        preferenceCount: result.preferences.failedKeys.length,
        preferencesAvailable: true
      });
      setPersonalClearConfirmed(false);
      setPersonalClearPreview({ fitStories: 0, marketSizingNotes: 0, preparationProfiles: 0, totalItems: 0 });
      setPersonalClearStatus("ready");
      setPreparedCompleteBackup(undefined);
      setQuestionPackPoolRevision((current) => current + 1);
      setSavedSettings(undefined);
      setAllClearStatus(
        result.status === "complete"
          ? "cleared"
          : result.preferences.status === "partial"
            ? "partial_preferences"
            : "partial_invalidation"
      );
    } catch {
      setAllClearStatus("error");
    } finally {
      storage?.close();
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    setImportConfirmed(false);
    setImportErrors([]);
    setImportSummary(undefined);
    setPendingImport(undefined);

    if (file === undefined) {
      setImportStatus("idle");
      return;
    }

    if (file.size > localProgressImportLimits.maxFileBytes) {
      setImportErrors([`Import file must be ${localProgressImportLimits.maxFileBytes} bytes or smaller.`]);
      setImportStatus("invalid");
      return;
    }

    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const validation = validateLocalProgressImportPayload(parsed, { sourceBytes: file.size });

      if (validation.status === "invalid") {
        setImportErrors(validation.errors);
        setImportStatus("invalid");
        return;
      }

      setPendingImport(validation.exportData);
      setImportStatus("ready");
    } catch {
      setImportErrors(["Import file must contain valid JSON."]);
      setImportStatus("invalid");
    }
  }

  async function handleImport() {
    if (pendingImport === undefined || !importConfirmed) {
      return;
    }

    setImportStatus("importing");

    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      await replaceLocalProgressWithImport(storage, pendingImport);
      setImportConfirmed(false);
      setImportSummary(createLocalProgressImportSummary(pendingImport));
      setPendingImport(undefined);
      setSavedSettings(pendingImport.stores.user_settings[0]?.settings);
      setStatus("ready");
      setImportStatus("imported");
    } catch {
      setImportStatus("error");
    } finally {
      storage?.close();
    }
  }

  const preparedBackupSummary = preparedCompleteBackup === undefined
    ? undefined
    : createCompleteBackupSummary(preparedCompleteBackup);
  const restoreBackupSummary = pendingCompleteRestore === undefined
    ? undefined
    : createCompleteBackupSummary(pendingCompleteRestore.backup, pendingCompleteRestore.sourceBytes);
  const allClearHasData = allClearPreview !== undefined && (
    allClearPreview.indexedDbRecords > 0 ||
    allClearPreview.preferenceCount > 0 ||
    !allClearPreview.preferencesAvailable
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        description={t("Review saved defaults and manage data stored in this browser. Drill setup changes affect one launch unless you explicitly save them as defaults.")}
        eyebrow={t("System")}
        title={t("Local App Settings")}
      />

      <section className={`${settingsPanelClass} grid gap-4`} data-testid="settings-appearance">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-coral">{t("Preferences")}</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">{t("Appearance")}</h2>
        </div>
        <ThemePreferenceSelect />
      </section>

      <section className={`${settingsPanelClass} grid gap-4`} data-testid="settings-preferences">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-coral">{t("Drill defaults")}</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">{t("Saved Drill Defaults")}</h2>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold text-ink transition hover:border-teal hover:text-teal"
            href="/drills"
          >
            {t("Open Drill Setup")}
          </Link>
        </div>

        {savedSettings === undefined ? (
          <LocalSaveNotice
            detail={
              status === "loading"
                ? t("Loading saved drill defaults...")
                : t("Built-in defaults initialize Drill Selection. Setup changes affect one launch unless you choose Save as my defaults.")
            }
            label={t("Drill defaults")}
            tone="neutral"
          />
        ) : (
          <div className="grid gap-3">
            <LocalSaveNotice
              detail={t("These saved defaults initialize Drill Selection. Changing a drill affects only that launch until you choose Save as my defaults.")}
              label={t("Drill defaults")}
            />
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SettingsStat label={t("Questions")} value={formatNumber(savedSettings.questionCount)} />
              <SettingsStat label={t("Difficulty")} value={t(savedSettings.difficulty)} />
              <SettingsStat label={t("Timing")} value={t(savedSettings.timeMode.replace("_", " "))} />
              <SettingsStat label={t("Feedback")} value={t(savedSettings.feedbackMode.replaceAll("_", " "))} />
            </dl>
          </div>
        )}

        <StatusMessage status={status} />
        <LocalSaveNotice
          detail={t(
            "Menus, controls, and guidance use the selected language. Bundled practice questions, case materials, and imported packs may remain in their source language."
          )}
          label={t("Language coverage")}
          tone="neutral"
        />
      </section>

      <details className={settingsDetailsClass} data-testid="settings-local-data">
        <summary className={settingsSummaryClass}>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-wide text-coral">{t("Local Data")}</span>
            <span className="mt-1 block text-lg font-semibold text-ink">{t("Export or replace local progress")}</span>
          </span>
          <span aria-hidden="true" className="text-2xl leading-none text-teal transition motion-reduce:transition-none group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="grid gap-6 border-t border-ink/10 pt-4">
          <p className="text-sm leading-6 text-ink/65">
            {t("No progress is sent to a server. Clearing browser storage or using reset removes local practice history.")}
          </p>
          <Link className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-teal underline underline-offset-4" href="/privacy/">
            {t("Privacy and analytics (English)")}
          </Link>
          <section aria-labelledby="storage-durability-heading" className="grid gap-3 border-t border-ink/10 pt-5">
            <div>
              <h3 className={uiSectionTitleClass} id="storage-durability-heading">{t("Storage durability")}</h3>
              <p className="mt-1 text-sm leading-6 text-ink/65">
                {t("Persistence reduces eviction risk but cannot protect against clearing site data, another person using this browser profile, device access, or data loss.")}
              </p>
            </div>
            <PersistenceStatusMessage status={persistenceStatus} />
            {persistenceStatus === "best_effort" || persistenceStatus === "error" ? (
              <button
                className="inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-teal px-4 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/30"
                onClick={() => void handleProtectLocalData()}
                type="button"
              >
                {t("Protect Local Data")}
              </button>
            ) : null}
          </section>

          <section aria-labelledby="standard-progress-export-heading" className="grid gap-3 border-t border-ink/10 pt-5">
            <div>
              <h3 className={uiSectionTitleClass} id="standard-progress-export-heading">{t("Standard Progress Export")}</h3>
              <p className="mt-1 text-sm leading-6 text-ink/65">
                {t("Exports practice progress only. Private stories, preparation profiles, notes, preferences, and installed packs are excluded.")}
              </p>
            </div>
            <button
              className="inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-teal px-4 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/30"
              disabled={exportStatus === "exporting"}
              onClick={() => void handleExport()}
              type="button"
            >
              {t(exportStatus === "exporting" ? "Exporting..." : "Export Local Progress")}
            </button>
            <ExportStatusMessage status={exportStatus} />
          </section>

          <section aria-labelledby="complete-backup-heading" className="grid gap-4 border-t border-ink/10 pt-5">
            <div>
              <h3 className={uiSectionTitleClass} id="complete-backup-heading">{t("Complete Backup")}</h3>
              <p className="mt-1 text-sm leading-6 text-ink/65">
                {t("Choose optional scopes, prepare a local preview, then confirm the cleartext download.")}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <BackupScopeCheckbox
                checked={includeBackupPrivateText}
                label="Include private stories, preparation profile, and notes"
                onChange={(checked) => updateCompleteBackupScope(() => setIncludeBackupPrivateText(checked))}
              />
              <BackupScopeCheckbox
                checked={includeBackupPacks}
                label="Include installed content packs"
                onChange={(checked) => updateCompleteBackupScope(() => setIncludeBackupPacks(checked))}
              />
              <BackupScopeCheckbox
                checked={includeBackupPreferences}
                label="Include locale, theme, timing, and question-pool preferences"
                onChange={(checked) => updateCompleteBackupScope(() => setIncludeBackupPreferences(checked))}
              />
            </div>
            <button
              className="inline-flex min-h-11 w-fit items-center justify-center rounded-md border border-teal px-4 text-sm font-semibold text-teal transition hover:bg-teal hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={completeExportStatus === "preparing"}
              onClick={() => void handlePrepareCompleteBackup()}
              type="button"
            >
              {t(completeExportStatus === "preparing" ? "Preparing backup..." : "Prepare Complete Backup")}
            </button>
            {preparedBackupSummary === undefined ? null : (
              <div className="grid gap-4 border-s-2 border-teal bg-teal/5 px-3 py-3" data-testid="complete-backup-export-preview">
                <h4 className="text-sm font-semibold text-ink">{t("Complete backup preview")}</h4>
                <BackupSummary summary={preparedBackupSummary} />
                <p className="text-sm leading-6 text-ink/75">
                  {t("This JSON backup is cleartext. Anyone with the file can read the selected data.")}
                </p>
                <label className={confirmationLabelClass}>
                  <input
                    checked={completeExportConfirmed}
                    className="h-4 w-4 shrink-0 accent-coral"
                    onChange={(event) => setCompleteExportConfirmed(event.currentTarget.checked)}
                    type="checkbox"
                  />
                  {t("I understand this download contains the selected cleartext data.")}
                </label>
                <button
                  className="inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-teal disabled:cursor-not-allowed disabled:bg-ink/30"
                  disabled={!completeExportConfirmed}
                  onClick={handleDownloadCompleteBackup}
                  type="button"
                >
                  {t("Download Complete Backup")}
                </button>
              </div>
            )}
            <CompleteExportStatusMessage status={completeExportStatus} />
          </section>

          <section aria-labelledby="restore-complete-backup-heading" className="grid gap-4 border-t border-ink/10 pt-5">
            <div>
              <h3 className={uiSectionTitleClass} id="restore-complete-backup-heading">{t("Restore Complete Backup")}</h3>
              <p className="mt-1 text-sm leading-6 text-ink/65">
                {t("This backup will replace selected sections. Sections not included in the file stay unchanged.")}
              </p>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-ink/75">
              {t("Choose a complete backup file")}
              <input
                accept="application/json,.json"
                className={fileInputClass}
                onChange={(event) => void handleCompleteBackupFile(event)}
                type="file"
              />
            </label>
            {restoreBackupSummary === undefined ? null : (
              <div className="grid gap-4 border-s-2 border-coral bg-coral/5 px-3 py-3" data-testid="complete-backup-restore-preview">
                <LocalSaveNotice
                  detail={t("Complete backup file is valid. Review its scopes and confirm replacement.")}
                  label={t("Compatible app and schema")}
                  tone="neutral"
                />
                <BackupSummary summary={restoreBackupSummary} />
                <label className={confirmationLabelClass}>
                  <input
                    checked={completeRestoreConfirmed}
                    className="h-4 w-4 shrink-0 accent-coral"
                    onChange={(event) => setCompleteRestoreConfirmed(event.currentTarget.checked)}
                    type="checkbox"
                  />
                  {t("I understand the selected sections will be replaced on this device.")}
                </label>
                <button
                  className={confirmationButtonClass}
                  disabled={!completeRestoreConfirmed || completeRestoreStatus === "restoring"}
                  onClick={() => void handleCompleteRestore()}
                  type="button"
                >
                  {t(completeRestoreStatus === "restoring" ? "Restoring backup..." : "Restore Selected Sections")}
                </button>
              </div>
            )}
            <CompleteRestoreStatusMessage
              errors={completeRestoreErrors}
              failedPreferenceKeys={preferenceRestoreFailures}
              status={completeRestoreStatus}
            />
          </section>

          <section aria-labelledby="import-progress-heading" className="grid gap-3 border-t border-ink/10 pt-5">
            <label className="grid gap-2 text-sm font-semibold text-ink/75">
              <span className={uiSectionTitleClass} id="import-progress-heading">{t("Import Local Progress")}</span>
              <input
                accept="application/json,.json"
                className={fileInputClass}
                onChange={(event) => void handleImportFile(event)}
                type="file"
              />
            </label>
            <label className="flex min-h-11 items-center gap-3 rounded-md border border-ink/10 px-3 py-2 text-sm font-medium text-ink has-[:checked]:border-coral has-[:checked]:bg-coral/10">
              <input
                checked={importConfirmed}
                className="h-4 w-4 accent-coral"
                disabled={pendingImport === undefined}
                onChange={(event) => setImportConfirmed(event.currentTarget.checked)}
                type="checkbox"
              />
              {t("I understand this replaces local progress on this device.")}
            </label>
            <button
              className={confirmationButtonClass}
              disabled={pendingImport === undefined || !importConfirmed || importStatus === "importing"}
              onClick={() => void handleImport()}
              type="button"
            >
              {t(importStatus === "importing" ? "Importing..." : "Import And Replace")}
            </button>
            <ImportStatusMessage errors={importErrors} status={importStatus} summary={importSummary} />
          </section>
        </div>
      </details>

      <details
        className={settingsDetailsClass}
        data-testid="settings-content-packs"
        id="question-pool-settings"
        onToggle={(event) => {
          if (event.currentTarget.open) setQuestionPackPoolOpened(true);
        }}
      >
        <summary className={settingsSummaryClass}>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-wide text-coral">{t("Content Packs")}</span>
            <span className="mt-1 block text-lg font-semibold text-ink">{t("Manage optional local question packs")}</span>
          </span>
          <span aria-hidden="true" className="text-2xl leading-none text-teal transition motion-reduce:transition-none group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="grid justify-items-start gap-3 border-t border-ink/10 pt-4">
          <p className="max-w-2xl text-sm leading-6 text-ink/70">
            {t("Discover, create, import, and manage local content packs in the dedicated Content Packs workspace.")}
          </p>
          {questionPackPoolOpened ? (
            <QuestionPackPoolSettings
              key={questionPackPoolRevision}
              storageFactory={storageFactory}
            />
          ) : null}
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold text-ink transition hover:border-teal hover:text-teal"
            href="/content-packs/?view=installed"
          >
            {t("Open Content Packs")}
          </Link>
        </div>
      </details>

      <details className={settingsDetailsClass} data-testid="settings-offline">
        <summary className={settingsSummaryClass}>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-wide text-coral">{t("Offline")}</span>
            <span className="mt-1 block text-lg font-semibold text-ink">{t("Understand local and offline use")}</span>
          </span>
          <span aria-hidden="true" className="text-2xl leading-none text-teal transition motion-reduce:transition-none group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="grid gap-4 border-t border-ink/10 pt-4">
          <dl className="grid gap-3 sm:grid-cols-3">
            <SettingsStat label="Browser" value={connectionState} />
            <SettingsStat label="Practice Content" value="Built in + local packs" />
            <SettingsStat label="Progress Sync" value="None" />
          </dl>
          <div className="grid gap-3 sm:grid-cols-3" data-testid="settings-offline-explanation">
            <OfflineNote
              label="Keep Practicing"
              text="Built-in practice content and installed question packs work without a content service."
            />
            <OfflineNote
              label="Open Once First"
              text="Visit a practice area while online before relying on it without a connection."
            />
            <OfflineNote
              label="Saved Here"
              text="Completed attempts and settings stay in this browser until you clear or reset local data."
            />
          </div>
        </div>
      </details>

      <details className={settingsDetailsClass} data-testid="settings-reset">
        <summary className={settingsSummaryClass}>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-wide text-coral">{t("Reset")}</span>
            <span className="mt-1 block text-lg font-semibold text-ink">{t("Reset local data")}</span>
          </span>
          <span aria-hidden="true" className="text-2xl leading-none text-coral transition motion-reduce:transition-none group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="grid gap-6 border-t border-coral/20 pt-4">
          <section aria-labelledby="personal-data-clear-heading" className="grid gap-4" data-testid="settings-personal-clear">
            <div>
              <h3 className={uiSectionTitleClass} id="personal-data-clear-heading">{t("Personal Data")}</h3>
              <p className="mt-1 text-sm leading-6 text-ink/65">
                {t("This removes saved Fit/PEI stories, preparation profiles, and market-sizing note text. Practice attempts, scores, installed packs, and preferences remain.")}
              </p>
            </div>
            {personalClearPreview === undefined ? null : (
              <dl className="grid gap-3 sm:grid-cols-3">
                <SettingsStat label={t("Fit stories")} value={formatNumber(personalClearPreview.fitStories)} />
                <SettingsStat label={t("Preparation profiles")} value={formatNumber(personalClearPreview.preparationProfiles)} />
                <SettingsStat label={t("Saved notes")} value={formatNumber(personalClearPreview.marketSizingNotes)} />
              </dl>
            )}
            <a className="w-fit text-sm font-semibold text-teal underline underline-offset-2" href="#complete-backup-heading">
              {t("Review Complete Backup options")}
            </a>
            <label className={confirmationLabelClass}>
              <input
                checked={personalClearConfirmed}
                className="h-4 w-4 shrink-0 accent-coral"
                disabled={(personalClearPreview?.totalItems ?? 0) === 0}
                onChange={(event) => setPersonalClearConfirmed(event.currentTarget.checked)}
                type="checkbox"
              />
              {t("I understand this removes only the personal text listed above.")}
            </label>
            <button
              className={confirmationButtonClass}
              disabled={!personalClearConfirmed || personalClearStatus === "clearing"}
              onClick={() => void handlePersonalDataClear()}
              type="button"
            >
              {t(personalClearStatus === "clearing" ? "Clearing personal data..." : "Clear Personal Data")}
            </button>
            <PersonalClearStatusMessage preview={personalClearPreview} status={personalClearStatus} />
          </section>

          <section aria-labelledby="practice-reset-heading" className="grid gap-4 border-t border-coral/20 pt-5">
            <div>
              <h3 className={uiSectionTitleClass} id="practice-reset-heading">{t("Practice Reset")}</h3>
              <p className="mt-1 text-sm leading-6 text-ink/65">
                {t("This clears drill defaults and presets, drill history, benchmark results, market sizing and exhibit attempts, mistake and review schedules, case-practice attempts, preparation profiles, and saved fit stories from this browser.")}
              </p>
            </div>

            <div className="grid gap-2 border-s-2 border-coral bg-coral/10 px-3 py-3" data-testid="settings-reset-warning">
              <p className="text-sm font-semibold text-ink">{t("Reset only affects this device.")}</p>
              <p className="text-sm leading-6 text-ink/70">
                {t("Drill defaults return to their initial values. Language, theme, timing preference, built-in content, and installed packs stay available.")}
              </p>
            </div>

            <label className="flex min-h-11 items-center gap-3 rounded-md border border-ink/10 px-3 py-2 text-sm font-medium text-ink has-[:checked]:border-coral has-[:checked]:bg-coral/10">
              <input
                checked={resetConfirmed}
                className="h-4 w-4 accent-coral"
                onChange={(event) => setResetConfirmed(event.currentTarget.checked)}
                type="checkbox"
              />
              {t("I understand this clears local practice data on this device.")}
            </label>

            <button
              className={confirmationButtonClass}
              disabled={!resetConfirmed || status === "resetting"}
              onClick={handleReset}
              type="button"
            >
              {t("Reset Local Data")}
            </button>
          </section>

          <section aria-labelledby="all-data-clear-heading" className="grid gap-4 border-t border-coral/20 pt-5" data-testid="settings-all-data-clear">
            <div>
              <h3 className={uiSectionTitleClass} id="all-data-clear-heading">{t("Clear All Saved App Data")}</h3>
              <p className="mt-1 text-sm leading-6 text-ink/65">
                {t("This removes every saved practice record, personal text item, installed content pack, and remembered preference from this browser. Built-in app files remain.")}
              </p>
            </div>
            {allClearPreview === undefined ? null : (
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SettingsStat label={t("IndexedDB records")} value={t("{count} records", { count: formatNumber(allClearPreview.indexedDbRecords) })} />
                <SettingsStat label={t("Personal items")} value={t("{count} items", { count: formatNumber(allClearPreview.personalItems) })} />
                <SettingsStat label={t("Installed packs")} value={t("{count} items", { count: formatNumber(allClearPreview.installedPacks) })} />
                <SettingsStat
                  label={t("Saved preferences")}
                  value={allClearPreview.preferencesAvailable
                    ? t("{count} items", { count: formatNumber(allClearPreview.preferenceCount) })
                    : t("Unavailable")}
                />
              </dl>
            )}
            <a className="w-fit text-sm font-semibold text-teal underline underline-offset-2" href="#complete-backup-heading">
              {t("Review Complete Backup before clearing")}
            </a>
            <label className={confirmationLabelClass}>
              <input
                checked={allClearConfirmed}
                className="h-4 w-4 shrink-0 accent-coral"
                disabled={!allClearHasData || allClearStatus === "clearing"}
                onChange={(event) => setAllClearConfirmed(event.currentTarget.checked)}
                type="checkbox"
              />
              {t("I understand this clears all saved app data from this browser.")}
            </label>
            <button
              className={confirmationButtonClass}
              disabled={!allClearConfirmed || allClearStatus === "clearing"}
              onClick={() => void handleAllDataClear()}
              type="button"
            >
              {t(allClearStatus === "clearing" ? "Clearing all saved app data..." : "Clear All Saved App Data")}
            </button>
            <AllClearStatusMessage failedPreferenceKeys={allClearFailedPreferences} hasData={allClearHasData} status={allClearStatus} />
          </section>
        </div>
      </details>
    </main>
  );
}

function BackupScopeCheckbox({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange(checked: boolean): void;
}) {
  const { t } = useI18n();

  return (
    <label className="flex min-h-11 items-start gap-3 rounded-md border border-ink/15 px-3 py-2 text-sm font-medium leading-6 text-ink has-[:checked]:border-teal has-[:checked]:bg-teal/10">
      <input
        checked={checked}
        className="mt-1 h-4 w-4 shrink-0 accent-teal"
        onChange={(event) => onChange(event.currentTarget.checked)}
        type="checkbox"
      />
      {t(label)}
    </label>
  );
}

function BackupSummary({ summary }: { summary: CompleteBackupSummary }) {
  const { formatNumber, t } = useI18n();

  return (
    <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <SettingsStat label={t("Progress records")} value={t("{count} records", { count: formatNumber(summary.progressRecordCount) })} />
      <SettingsStat label={t("Private records and notes")} value={t("{count} items", { count: formatNumber(summary.privateEntryCount) })} />
      <SettingsStat label={t("Installed packs")} value={t("{count} items", { count: formatNumber(summary.packCount) })} />
      <SettingsStat label={t("Preferences included")} value={t(summary.preferencesIncluded ? "Included" : "Not included")} />
      <SettingsStat label={t("File size")} value={t("{count} bytes", { count: formatNumber(summary.fileBytes) })} />
      <SettingsStat label={t("Schema version")} value={formatNumber(summary.schemaVersion)} />
    </dl>
  );
}

function PersistenceStatusMessage({ status }: { status: PersistenceUiStatus }) {
  const { t } = useI18n();
  const content: Record<PersistenceUiStatus, { detail: string; label: string; tone: "error" | "neutral" | "success" }> = {
    best_effort: {
      detail: "This browser may still evict local data. Protect Local Data asks for stronger retention.",
      label: "Best-effort storage",
      tone: "neutral"
    },
    checking: { detail: "Checking storage protection...", label: "Storage durability", tone: "neutral" },
    error: {
      detail: "Storage protection could not be checked.",
      label: "Storage protection unavailable",
      tone: "error"
    },
    persistent: {
      detail: "This browser reports persistent storage for this site.",
      label: "Persistent storage",
      tone: "success"
    },
    requesting: { detail: "Requesting protection...", label: "Storage durability", tone: "neutral" },
    unsupported: {
      detail: "This browser does not expose persistent-storage controls.",
      label: "Storage protection unsupported",
      tone: "neutral"
    }
  };
  const current = content[status];

  return <LocalSaveNotice detail={t(current.detail)} label={t(current.label)} tone={current.tone} />;
}

function CompleteExportStatusMessage({ status }: { status: CompleteExportStatus }) {
  const { t } = useI18n();
  if (status !== "downloaded" && status !== "error") return null;

  return (
    <LocalSaveNotice
      detail={t(status === "downloaded" ? "Complete backup downloaded." : "Complete backup creation failed.")}
      label={t("Complete Backup")}
      tone={status === "error" ? "error" : "success"}
    />
  );
}

function CompleteRestoreStatusMessage({
  errors,
  failedPreferenceKeys,
  status
}: {
  errors: string[];
  failedPreferenceKeys: string[];
  status: CompleteRestoreStatus;
}) {
  const { t } = useI18n();

  if (status === "idle" || status === "ready" || status === "restoring") return null;
  if (status === "invalid") {
    return (
      <LocalSaveNotice
        detail={errors.map((error) => t(error)).join(" ")}
        label={t("Incompatible or invalid backup")}
        tone="error"
      />
    );
  }

  const preferenceNames = failedPreferenceKeys.map((key) =>
    t(preferenceLabelByStorageKey[key] ?? "Preference")
  ).join(", ");
  const detail = status === "partial"
    ? t("Progress restored, but these preferences could not be saved: {keys}.", { keys: preferenceNames })
    : t(status === "restored" ? "Complete backup restored." : "Complete backup restore failed.");

  return (
    <LocalSaveNotice
      detail={detail}
      label={t("Restore Complete Backup")}
      tone={status === "error" || status === "partial" ? "error" : "success"}
    />
  );
}

function PersonalClearStatusMessage({
  preview,
  status
}: {
  preview: PersonalDataClearPreview | undefined;
  status: PersonalClearStatus;
}) {
  const { t } = useI18n();

  if (status === "ready" && (preview?.totalItems ?? 0) > 0) return null;
  const content = {
    cleared: { detail: "Personal data cleared.", tone: "success" as const },
    clearing: { detail: "Clearing personal data...", tone: "neutral" as const },
    error: { detail: "Personal data clear failed.", tone: "error" as const },
    loading: { detail: "Checking saved personal data...", tone: "neutral" as const },
    partial: { detail: "Personal data was cleared here, but other open tabs could not be notified. Close or reload them before continuing.", tone: "error" as const },
    ready: { detail: "No saved personal text was found.", tone: "neutral" as const }
  }[status];

  return <LocalSaveNotice detail={t(content.detail)} label={t("Personal Data")} tone={content.tone} />;
}

function AllClearStatusMessage({
  failedPreferenceKeys,
  hasData,
  status
}: {
  failedPreferenceKeys: string[];
  hasData: boolean;
  status: AllClearStatus;
}) {
  const { t } = useI18n();

  if (status === "ready" && hasData) return null;
  if (status === "partial_preferences") {
    const names = failedPreferenceKeys.map((key) =>
      t(preferenceLabelByStorageKey[key] ?? "Preference")
    ).join(", ");

    return (
      <LocalSaveNotice
        detail={t("Saved records were cleared, but these preferences could not be removed: {keys}.", { keys: names })}
        label={t("Clear All Saved App Data")}
        tone="error"
      />
    );
  }

  const content = {
    cleared: { detail: "All saved app data cleared.", tone: "success" as const },
    clearing: { detail: "Clearing all saved app data...", tone: "neutral" as const },
    error: { detail: "Clear all saved app data failed.", tone: "error" as const },
    loading: { detail: "Checking all saved app data...", tone: "neutral" as const },
    partial_invalidation: { detail: "Saved app data was cleared, but other open tabs could not be notified. Close or reload them before continuing.", tone: "error" as const },
    ready: { detail: "No saved app data was found.", tone: "neutral" as const }
  }[status];

  return <LocalSaveNotice detail={t(content.detail)} label={t("Clear All Saved App Data")} tone={content.tone} />;
}

const preferenceLabelByStorageKey: Readonly<Record<string, string>> = {
  [localePreferenceStorageKey]: "Language",
  [questionPackPoolPreferenceStorageKey]: "Question pool",
  [themePreferenceStorageKey]: "Theme",
  [timingAccommodationPreferenceKey]: "Timing"
};

function SettingsStat({ label, value }: { label: string; value: string }) {
  const { t } = useI18n();
  return (
    <div className="border-s-2 border-ink/15 bg-paper px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t(label)}</dt>
      <dd className="mt-1 capitalize text-ink">{t(value)}</dd>
    </div>
  );
}

function OfflineNote({ label, text }: { label: string; text: string }) {
  const { t } = useI18n();
  return (
    <div className="border border-ink/15 px-3 py-3">
      <p className="text-sm font-semibold text-ink">{t(label)}</p>
      <p className="mt-1 text-sm leading-6 text-ink/65">{t(text)}</p>
    </div>
  );
}

function StatusMessage({ status }: { status: SettingsStatus }) {
  const { t } = useI18n();
  if (!["error", "reset", "resetting"].includes(status)) {
    return null;
  }

  const text = {
    error: "Local settings are unavailable.",
    loading: "",
    ready: "",
    reset: "Local data reset. Default preferences are active again.",
    resetting: "Resetting local data..."
  }[status];

  return <LocalSaveNotice detail={t(text)} label={t("Local data")} tone={status === "error" ? "error" : "success"} />;
}

function ExportStatusMessage({ status }: { status: ExportStatus }) {
  const { t } = useI18n();
  if (status === "idle" || status === "exporting") {
    return null;
  }

  return (
    <LocalSaveNotice
      detail={t(status === "exported" ? "Local progress export downloaded." : "Local progress export failed.")}
      label={t("Export")}
      tone={status === "error" ? "error" : "success"}
    />
  );
}

function ImportStatusMessage({
  errors,
  status,
  summary
}: {
  errors: string[];
  status: ImportStatus;
  summary?: LocalProgressImportSummary;
}) {
  const { t } = useI18n();
  if (status === "idle" || status === "importing") {
    return null;
  }

  if (status === "invalid") {
    return <LocalSaveNotice detail={errors.map((error) => t(error)).join(" ")} label={t("Import")} tone="error" />;
  }

  const detail = {
    error: "Local progress import failed.",
    imported: "Local progress import replaced data on this device.",
    ready: "Import file is valid. Confirm replacement to continue."
  }[status];

  return (
    <div className="grid gap-3">
      <LocalSaveNotice detail={t(detail)} label={t("Import")} tone={status === "error" ? "error" : "success"} />
      {status === "imported" && summary !== undefined ? <ImportSummary summary={summary} /> : null}
    </div>
  );
}

function ImportSummary({ summary }: { summary: LocalProgressImportSummary }) {
  const { formatNumber, t } = useI18n();
  return (
    <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <SettingsStat label={t("Sessions")} value={formatNumber(summary.sessions)} />
      <SettingsStat label={t("Responses")} value={formatNumber(summary.responses)} />
      <SettingsStat label={t("Benchmarks")} value={formatNumber(summary.benchmarks)} />
      <SettingsStat label={t("Market Sizing")} value={formatNumber(summary.marketSizingAttempts)} />
      <SettingsStat label={t("Exhibits")} value={formatNumber(summary.exhibitAttempts)} />
      <SettingsStat label={t("Case Practice")} value={formatNumber(summary.practiceRecords)} />
      <SettingsStat label={t("Settings")} value={formatNumber(summary.settings)} />
      <SettingsStat label={t("Skill Scores")} value={formatNumber(summary.skillScores)} />
    </dl>
  );
}

function downloadLocalProgressExport(exported: LocalProgressExport): void {
  downloadJson(serializeLocalProgressExport(exported), buildLocalProgressExportFileName(exported.exportedAt));
}

function downloadJson(contents: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
