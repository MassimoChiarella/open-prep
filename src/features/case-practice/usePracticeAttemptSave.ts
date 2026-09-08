"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { savePracticeAttempt } from "@/features/case-practice/practiceRecords";
import type { PracticeAttemptRecord } from "@/features/case-practice/practiceTypes";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";

export type PracticeAttemptSaveState = "idle" | "saving" | "saved" | "error";
type Attempt = Omit<PracticeAttemptRecord, "id" | "kind">;

export function usePracticeAttemptSave(storageFactory: () => AppStorage = createIndexedDbAppStorage) {
  const [saveState, setSaveState] = useState<PracticeAttemptSaveState>("idle");
  const pending = useRef<Attempt>();
  const revision = useRef(0);
  const status = useRef<PracticeAttemptSaveState>("idle");

  useEffect(() => () => { revision.current += 1; pending.current = undefined; }, []);

  const resetSave = useCallback(() => {
    revision.current += 1;
    pending.current = undefined;
    status.current = "idle";
    setSaveState("idle");
  }, []);

  const writeAttempt = useCallback(async (attempt: Attempt): Promise<boolean> => {
    const currentRevision = ++revision.current;
    status.current = "saving";
    setSaveState("saving");
    let storage: AppStorage | undefined;
    try {
      storage = storageFactory();
      await savePracticeAttempt(storage, attempt);
      if (revision.current !== currentRevision) return false;
      status.current = "saved";
      setSaveState("saved");
      return true;
    } catch {
      if (revision.current === currentRevision) {
        status.current = "error";
        setSaveState("error");
      }
      return false;
    } finally {
      storage?.close();
    }
  }, [storageFactory]);

  const saveAttempt = useCallback((attempt: Attempt): Promise<boolean> => {
    if (status.current === "saving") return Promise.resolve(false);
    pending.current = { ...attempt };
    return writeAttempt(pending.current);
  }, [writeAttempt]);

  const retrySave = useCallback((): Promise<boolean> => {
    if (pending.current === undefined || status.current !== "error") return Promise.resolve(false);
    return writeAttempt(pending.current);
  }, [writeAttempt]);

  return { resetSave, retrySave, saveAttempt, saveState };
}
