"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useState } from "react";

import { LocalSaveNotice } from "@/components/LocalSaveNotice";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentConnectionState } from "@/features/offline/OfflineStatusIndicator";
import { QuestionPackManager } from "@/features/question-packs/QuestionPackManager";
import { useI18n } from "@/features/i18n/I18nProvider";
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
import { loadUserDrillSettings, resetLocalData } from "@/features/settings/settingsPersistence";
import { ThemePreferenceSelect } from "@/features/theme/ThemePreferenceSelect";
import type { DrillSettings } from "@/lib/domain";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

type SettingsStatus = "error" | "loading" | "ready" | "reset" | "resetting";
type ExportStatus = "error" | "exported" | "exporting" | "idle";
type ImportStatus = "error" | "idle" | "imported" | "importing" | "invalid" | "ready";
type ConnectionState = ReturnType<typeof getCurrentConnectionState>;

const settingsPanelClass =
  "min-w-0 border border-ink/15 border-t-2 border-t-coral bg-white p-5 sm:p-6";
const settingsDetailsClass = `${settingsPanelClass} group grid gap-4`;
const settingsSummaryClass =
  "-m-2 flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 p-2 transition-colors marker:content-none hover:bg-paper/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal";

export function LocalSettingsView({
  storageFactory = createIndexedDbAppStorage
}: {
  storageFactory?: () => AppStorage;
} = {}) {
  const { formatNumber, t } = useI18n();
  const [connectionState, setConnectionState] = useState<ConnectionState>("online");
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [importConfirmed, setImportConfirmed] = useState(false);
  const [includePrivateStories, setIncludePrivateStories] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState<LocalProgressImportSummary | undefined>();
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [pendingImport, setPendingImport] = useState<LocalProgressExport | undefined>();
  const [savedSettings, setSavedSettings] = useState<DrillSettings | undefined>();
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const [status, setStatus] = useState<SettingsStatus>("loading");

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
        storage,
        undefined,
        includePrivateStories ? "complete" : "standard"
      );

      downloadLocalProgressExport(exported);
      setExportStatus("exported");
    } catch {
      setExportStatus("error");
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
        <div className="grid gap-4 border-t border-ink/10 pt-4">
          <p className="text-sm leading-6 text-ink/65">
            {t("No progress is sent to a server. Clearing browser storage or using reset removes local practice history.")}
          </p>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SettingsStat label="Drills" value="Local history" />
            <SettingsStat label="Benchmarks" value="Local scores" />
            <SettingsStat label="Market Sizing" value="Local attempts" />
            <SettingsStat label="Exhibits" value="Local attempts" />
          </dl>
          <button
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-teal px-4 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/30"
            disabled={exportStatus === "exporting"}
            onClick={() => void handleExport()}
            type="button"
          >
            {t(exportStatus === "exporting" ? "Exporting..." : "Export Local Progress")}
          </button>
          <p className="text-sm leading-6 text-ink/65">
            {t("Exports stay on this device until you choose where to save them. Saved Fit/PEI stories can contain private personal text and are excluded by default.")}
          </p>
          <label className="flex min-h-11 items-center gap-3 rounded-md border border-ink/10 px-3 py-2 text-sm font-medium text-ink has-[:checked]:border-teal has-[:checked]:bg-teal/10">
            <input
              checked={includePrivateStories}
              className="h-4 w-4 accent-teal"
              onChange={(event) => setIncludePrivateStories(event.currentTarget.checked)}
              type="checkbox"
            />
            {t("Include saved Fit/PEI story text in this export.")}
          </label>
          <ExportStatusMessage status={exportStatus} />

          <div className="grid gap-3 border border-ink/15 border-t-2 border-t-coral px-3 py-3">
            <label className="grid gap-2 text-sm font-semibold text-ink/75">
              {t("Import Local Progress")}
              <input
                accept="application/json,.json"
                className="block min-h-11 w-full text-sm text-ink file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-white file:px-3 file:text-sm file:font-semibold file:text-ink"
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
              className="inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-coral px-4 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/30"
              disabled={pendingImport === undefined || !importConfirmed || importStatus === "importing"}
              onClick={() => void handleImport()}
              type="button"
            >
              {t(importStatus === "importing" ? "Importing..." : "Import And Replace")}
            </button>
            <ImportStatusMessage errors={importErrors} status={importStatus} summary={importSummary} />
          </div>
        </div>
      </details>

      <details className={settingsDetailsClass} data-testid="settings-content-packs">
        <summary className={settingsSummaryClass}>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-wide text-coral">{t("Content Packs")}</span>
            <span className="mt-1 block text-lg font-semibold text-ink">{t("Manage optional local question packs")}</span>
          </span>
          <span aria-hidden="true" className="text-2xl leading-none text-teal transition motion-reduce:transition-none group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="border-t border-ink/10 pt-4">
          <QuestionPackManager />
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
        <div className="grid gap-4 border-t border-coral/20 pt-4">
          <p className="text-sm leading-6 text-ink/65">
            {t("This clears drill defaults and presets, drill history, benchmark results, market sizing and exhibit attempts, mistake and review schedules, case-practice attempts, preparation profiles, and saved fit stories from this browser.")}
          </p>

          <div className="grid gap-2 border-s-2 border-coral bg-coral/10 px-3 py-3" data-testid="settings-reset-warning">
            <p className="text-sm font-semibold text-ink">{t("Reset only affects this device.")}</p>
            <p className="text-sm leading-6 text-ink/70">
              {t("The app will return to default preferences after reset. Built-in content and installed question packs stay available.")}
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
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-coral px-4 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/30"
            disabled={!resetConfirmed || status === "resetting"}
            onClick={handleReset}
            type="button"
          >
            {t("Reset Local Data")}
          </button>
        </div>
      </details>
    </main>
  );
}

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
  const url = URL.createObjectURL(new Blob([serializeLocalProgressExport(exported)], { type: "application/json" }));
  const link = document.createElement("a");

  link.href = url;
  link.download = buildLocalProgressExportFileName(exported.exportedAt);
  link.click();
  URL.revokeObjectURL(url);
}
