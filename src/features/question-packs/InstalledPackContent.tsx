"use client";

import { useEffect, useState, type ReactNode } from "react";

import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { useI18n } from "@/features/i18n/I18nProvider";
import { readQuestionPackPoolPreference } from "@/features/question-packs/questionPackPoolPreference";
import type { AppStorage, QuestionPackRecord } from "@/lib/storage/appStorageTypes";

export type InstalledPackKind = "benchmark" | "case_practice" | "exhibit" | "market_sizing";
export type PackForKind<TKind extends InstalledPackKind> = Extract<QuestionPackRecord, { kind: TKind }>;
export type PackLoadState<TKind extends InstalledPackKind> =
  | { message: string; recoveryHref?: string; recoveryLabel?: string; status: "error" }
  | { status: "loading" }
  | {
      includeBuiltIns: boolean;
      packs: PackForKind<TKind>[];
      source: "direct" | "preference";
      status: "ready";
    };

export function QuestionPackContentBoundary({
  children,
  pack
}: {
  children: ReactNode;
  pack?: QuestionPackRecord;
}) {
  if (pack === undefined) return <>{children}</>;

  return (
    <div className="contents" dir="auto" lang={pack.catalogProvenance?.language}>
      {children}
    </div>
  );
}

export function useInstalledPack<TKind extends InstalledPackKind>(
  packId: string | undefined,
  kind: TKind,
  storageFactory: () => AppStorage
): PackLoadState<TKind> {
  const [state, setState] = useState<PackLoadState<TKind>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let storage: AppStorage | undefined;
    const requestedPackId = packId?.trim();

    void Promise.resolve().then(() => {
      if (!cancelled) setState({ status: "loading" });
    });

    if (requestedPackId === undefined || requestedPackId === "") {
      const preference = readQuestionPackPoolPreference();
      const includeBuiltIns = preference.mode !== "selected_only";

      if (preference.mode === "built_in_only") {
        void Promise.resolve().then(() => {
          if (!cancelled) {
            setState({ includeBuiltIns: true, packs: [], source: "preference", status: "ready" });
          }
        });
        return () => {
          cancelled = true;
        };
      }

      if (preference.selectedPackIds.length === 0) {
        void Promise.resolve().then(() => {
          if (cancelled) return;
          setState(includeBuiltIns
            ? { includeBuiltIns, packs: [], source: "preference", status: "ready" }
            : noCompatibleSelectedPacksState());
        });
        return () => {
          cancelled = true;
        };
      }

      try {
        storage = storageFactory();
        const selectedStorage = storage;
        void Promise.all(
          preference.selectedPackIds.map((selectedPackId) => selectedStorage.get("question_packs", selectedPackId))
        )
          .then((packs) => packs.filter(
            (pack): pack is PackForKind<TKind> => pack !== undefined && isPackForKind(pack, kind)
          ))
          .then((packs) => {
            if (cancelled) return;
            setState(!includeBuiltIns && packs.length === 0
              ? noCompatibleSelectedPacksState()
              : { includeBuiltIns, packs, source: "preference", status: "ready" });
          })
          .catch(() => {
            if (!cancelled) {
              setState({ message: "Installed content packs are unavailable.", status: "error" });
            }
          })
          .finally(() => storage?.close());
      } catch {
        void Promise.resolve().then(() => {
          if (!cancelled) setState({ message: "Installed content packs are unavailable.", status: "error" });
        });
      }

      return () => {
        cancelled = true;
        storage?.close();
      };
    }

    try {
      storage = storageFactory();
      void storage
        .get("question_packs", requestedPackId)
        .then((pack) => {
          if (pack === undefined) throw new Error("This content pack is not installed on this device.");
          if (!isPackForKind(pack, kind)) {
            throw new Error(`This pack does not contain ${kind.replace("_", "-")} content.`);
          }
          if (!cancelled) {
            setState({ includeBuiltIns: false, packs: [pack], source: "direct", status: "ready" });
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setState({
              message: error instanceof Error ? error.message : "Unable to load this content pack.",
              status: "error"
            });
          }
        })
        .finally(() => storage?.close());
    } catch {
      void Promise.resolve().then(() => {
        if (!cancelled) setState({ message: "Installed content packs are unavailable.", status: "error" });
      });
    }

    return () => {
      cancelled = true;
      storage?.close();
    };
  }, [kind, packId, storageFactory]);

  return state;
}

function isPackForKind<TKind extends InstalledPackKind>(
  pack: QuestionPackRecord,
  kind: TKind
): pack is PackForKind<TKind> {
  return pack.kind === kind && (pack.schemaVersion === 2 || (kind === "case_practice" && pack.schemaVersion === 3));
}

function noCompatibleSelectedPacksState(): Extract<PackLoadState<InstalledPackKind>, { status: "error" }> {
  return {
    message: "No compatible selected content packs are installed. Choose at least one pack for this practice area.",
    recoveryHref: "/settings#question-pool-settings",
    recoveryLabel: "Review Question Pool",
    status: "error"
  };
}

export function SpecializedPackState({
  kindLabel,
  packId,
  state
}: {
  kindLabel: string;
  packId?: string;
  state:
    | { message: string; recoveryHref?: string; recoveryLabel?: string; status: "error" }
    | { status: "loading" };
}) {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        action={state.status === "error" && state.recoveryHref !== undefined
          ? { href: state.recoveryHref, label: t(state.recoveryLabel ?? "Review Question Pool") }
          : { href: "/content-packs/?view=installed", label: t("Manage Content Packs") }}
        description={t("Load a locally installed {kind} pack.", { kind: t(kindLabel) })}
        eyebrow={t("Custom Content")}
        title={t("Content Pack")}
      />
      {state.status === "loading" ? (
        <LoadingState detail={packId} label={t("Loading {kind} pack...", { kind: t(kindLabel) })} />
      ) : (
        <p className="border border-coral/30 border-s-2 border-s-coral bg-coral/10 p-4 text-sm leading-6 text-ink" role="alert">
          {t(state.message)}
        </p>
      )}
    </main>
  );
}

