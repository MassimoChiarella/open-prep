"use client";

import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";
import { AppStorageConflictError, type AppStorage } from "@/lib/storage/appStorageTypes";
import { createBrowserLocalRecovery, type BrowserLocalRecovery } from "@/features/settings/browserLocalRecovery";
import type { LocalRecoveryItem, LocalRecoveryPreviewSummary } from "@/features/settings/localRecordRecovery";

export function LocalRecordRecoveryPanel({ storageFactory, onRecovered }: {
  storageFactory: () => AppStorage;
  onRecovered: () => void;
}) {
  const { t, formatNumber } = useI18n();
  const [items, setItems] = useState<LocalRecoveryItem[]>();
  const [preview, setPreview] = useState<LocalRecoveryPreviewSummary>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [archiveOffered, setArchiveOffered] = useState(false);
  const [skipArchive, setSkipArchive] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const mounted = useRef(true);
  const operation = useRef(false);
  const session = useRef<BrowserLocalRecovery>(undefined);
  const sessionAbort = useRef<AbortController>(undefined);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const checkButton = useRef<HTMLButtonElement>(null);
  const reloadButton = useRef<HTMLButtonElement>(null);
  const hadPreview = useRef(false);
  useEffect(() => {
    if (busy) return;
    if (preview !== undefined) previewHeading.current?.focus();
    else if (hadPreview.current) (needsReload ? reloadButton.current : checkButton.current)?.focus();
    hadPreview.current = preview !== undefined;
  }, [busy, needsReload, preview]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; disposeSession(); };
  }, []);

  function disposeSession() {
    sessionAbort.current?.abort();
    session.current?.dispose();
    session.current = undefined;
    sessionAbort.current = undefined;
  }

  async function run(action: (recovery: BrowserLocalRecovery) => Promise<void>) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setMessage("");
    try {
      if (session.current === undefined) {
        const controller = new AbortController();
        sessionAbort.current = controller;
        const recovery = await createBrowserLocalRecovery(storageFactory, controller.signal);
        if (!mounted.current || controller.signal.aborted) { recovery.dispose(); return; }
        session.current = recovery;
      }
      await action(session.current);
    } catch (error) {
      disposeSession();
      if (mounted.current) {
        setConfirmed(false);
        setPreview(undefined);
        const generationChanged = error instanceof AppStorageConflictError && error.reason === "generation";
        setNeedsReload(generationChanged);
        setMessage(generationChanged ? "Saved data was replaced or cleared. Reload this page before reviewing recovery."
          : error instanceof AppStorageConflictError ? "Saved data changed. Check the records again before confirming recovery."
          : "Recovery could not be completed. Check the records again before retrying.");
      }
    } finally {
      operation.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function downloadArchive() {
    if (preview === undefined) return;
    await run(async (recovery) => {
      const blob = await recovery.archive();
      if (!mounted.current) return;
      let url: string | undefined;
      try {
        url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `open-prep-recovery-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        setArchiveOffered(true);
        setMessage("");
      } catch {
        setArchiveOffered(false);
        setConfirmed(false);
        setMessage("The recovery archive could not be downloaded. No records were changed.");
      } finally {
        if (url !== undefined) URL.revokeObjectURL(url);
      }
    });
  }

  function describeIssue(reason: string) {
    const length = /^Text contains (\d+) code units; the backup limit is (\d+)\.$/.exec(reason);
    return length === null ? t(reason) : t("Text contains {length} code units; the backup limit is {limit}.", {
      length: formatNumber(Number(length[1])), limit: formatNumber(Number(length[2]))
    });
  }

  return <details className="grid min-w-0 gap-3 border-t border-ink/10 pt-5" id="record-recovery">
    <summary className="min-h-11 cursor-pointer text-lg font-semibold text-ink">{t("Recover individual records")}</summary>
    <div className="mt-3 grid min-w-0 gap-4" aria-busy={busy}>
      <p>{t("Find saved records that prevent a backup, then review one attempt at a time. Checking changes nothing.")}</p>
      <button className={buttonClass("secondary")} disabled={busy || needsReload} ref={checkButton} type="button" onClick={() => void run(async (recovery) => {
        const found = await recovery.diagnose();
        if (mounted.current) { setItems(found); setPreview(undefined); setConfirmed(false); }
      })}>{t(busy ? "Checking local records..." : "Check local records")}</button>
      {items?.length === 0 ? <p role="status">{t("No incompatible records found.")}</p> : null}
      {items !== undefined && preview === undefined ? <ul className="grid min-w-0 gap-3">
        {items.map((item) => <li className="grid min-w-0 gap-2 border border-ink/20 p-3 [overflow-wrap:anywhere]" key={item.id}>
          <p><bdi dir="auto">{item.storeName}: {item.recordId.slice(0, 160)}</bdi></p>
          <ul>{item.issues.slice(0, 5).map((issue, index) => <li key={index}>
            <bdi dir="auto">{issue.path.slice(0, 160) || "record"}</bdi>: {describeIssue(issue.reason)}
          </li>)}</ul>
          {item.unavailableReason === undefined ? <button className={buttonClass("secondary")} disabled={busy} type="button" onClick={() => void run(async (recovery) => {
            const next = await recovery.prepare(item);
            if (mounted.current) { setPreview(next); setArchiveOffered(false); setSkipArchive(false); setConfirmed(false); }
          })}>{t("Review recovery")}</button> : <p>{t(item.unavailableReason)}</p>}
        </li>)}
      </ul> : null}
      {preview === undefined ? null : <section className="grid min-w-0 gap-3 border border-coral p-4 [overflow-wrap:anywhere]">
        <h4 className="font-semibold" ref={previewHeading} tabIndex={-1}>{t(preview.action === "remove_note" ? "Remove the incompatible note only" : "Remove this attempt and its owned records")}</h4>
        <p><bdi dir="auto">{preview.storeName}: {preview.recordId.slice(0, 160)}</bdi></p>
        <ul>{Object.entries(preview.counts).map(([store, count]) => <li key={store}>{store}: {formatNumber(count)}</li>)}</ul>
        <p>{t(preview.action === "remove_note" ? "The attempt and its score will remain saved." : "Independent later attempts and unrelated saved data will remain saved.")}</p>
        {preview.reviewHistoryRetained ? <p>{t("Existing review totals cannot be reversed reliably and will remain unchanged.")}</p> : null}
        <p>{t("The recovery archive may contain private text. It is a diagnostic file, not a restorable backup.")}</p>
        <button className={buttonClass("secondary")} disabled={busy} onClick={() => void downloadArchive()} type="button">{t("Download original-data archive")}</button>
        <label className="flex min-h-11 items-start gap-3">
          <input checked={skipArchive} disabled={busy} onChange={(event) => { setSkipArchive(event.currentTarget.checked); setConfirmed(false); }} type="checkbox" />
          <span>{t("Remove without an archive; I accept losing the original records.")}</span>
        </label>
        <label className="flex min-h-11 items-start gap-3">
          <input checked={confirmed} disabled={busy || (!archiveOffered && !skipArchive)} onChange={(event) => setConfirmed(event.currentTarget.checked)} type="checkbox" />
          <span>{t("I have saved the archive or chosen to continue without it, and confirm this removal.")}</span>
        </label>
        <div className="flex flex-wrap gap-3">
          <button className={buttonClass("danger")} disabled={busy || !confirmed || (!archiveOffered && !skipArchive)} type="button" onClick={() => void run(async (recovery) => {
            await recovery.apply();
            if (mounted.current) {
              setItems(undefined); setPreview(undefined); setConfirmed(false);
              setNeedsReload(true);
              setMessage("Recovery completed. Refresh this page before preparing a new backup.");
              onRecovered();
            }
          })}>{t("Confirm scoped removal")}</button>
          <button className={buttonClass("secondary")} disabled={busy} type="button" onClick={() => { disposeSession(); setPreview(undefined); setConfirmed(false); }}>{t("Cancel")}</button>
        </div>
      </section>}
      {message ? <p role="status">{t(message)}</p> : null}
      {needsReload ? <button className={buttonClass("secondary")} ref={reloadButton} onClick={() => window.location.reload()} type="button">{t("Reload page")}</button> : null}
    </div>
  </details>;
}
