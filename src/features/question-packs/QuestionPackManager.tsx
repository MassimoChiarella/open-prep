"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";

import { LocalSaveNotice } from "@/components/LocalSaveNotice";
import { badgeClass, buttonClass } from "@/components/uiStyles";
import { QuestionPackBuilder } from "@/features/question-packs/QuestionPackBuilder";
import { QuestioningPackBuilder } from "@/features/question-packs/QuestioningPackBuilder";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  buildQuestionPackDrillHref,
  deleteQuestionPack,
  getQuestionPackDifficultyCounts,
  loadQuestionPacks,
  questionPackMaxFileBytes,
  saveQuestionPack,
  serializeQuestionPack,
  validateQuestionPackPayload
} from "@/features/question-packs/questionPack";
import type { Difficulty, UnitType } from "@/lib/domain";
import { formatLabel, formatNumber } from "@/lib/format";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type { AppStorage, QuestionPackRecord } from "@/lib/storage/appStorageTypes";

type ImportStatus = "error" | "idle" | "installed" | "invalid" | "ready" | "saving";
type ListStatus = "error" | "loading" | "ready";

const difficultyOrder: Difficulty[] = ["beginner", "intermediate", "advanced", "expert"];

const packKindInfo = {
  benchmark: { label: "Benchmarks", route: "/benchmark" },
  case_practice: { label: "Case practice", route: "/case-practice" },
  exhibit: { label: "Exhibits", route: "/exhibits" },
  fixed_numeric: { label: "Fixed numeric" },
  generated_template: { label: "Generated templates" },
  market_sizing: { label: "Market sizing", route: "/market-sizing" }
} as const satisfies Record<QuestionPackRecord["kind"], { label: string; route?: string }>;

export function QuestionPackManager({
  storageFactory = createIndexedDbAppStorage
}: {
  storageFactory?: () => AppStorage;
} = {}) {
  const { t } = useI18n();
  const [deleteId, setDeleteId] = useState<string>();
  const [errors, setErrors] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [listStatus, setListStatus] = useState<ListStatus>("loading");
  const [packs, setPacks] = useState<QuestionPackRecord[]>([]);
  const [pendingPack, setPendingPack] = useState<QuestionPackRecord>();

  const replacing = useMemo(
    () => pendingPack !== undefined && packs.some((pack) => pack.id === pendingPack.id),
    [packs, pendingPack]
  );
  const pendingPresentation = useMemo(
    () => pendingPack === undefined ? undefined : getPackPresentation(pendingPack),
    [pendingPack]
  );

  useEffect(() => {
    let cancelled = false;
    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      void loadQuestionPacks(storage)
        .then((loaded) => {
          if (!cancelled) {
            setPacks(loaded);
            setListStatus("ready");
          }
        })
        .catch(() => {
          if (!cancelled) {
            setListStatus("error");
          }
        })
        .finally(() => storage?.close());
    } catch {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setListStatus("error");
        }
      });
    }

    return () => {
      cancelled = true;
      storage?.close();
    };
  }, [storageFactory]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    setErrors([]);
    setImportStatus("idle");
    setPendingPack(undefined);

    if (file === undefined) {
      return;
    }

    if (file.size > questionPackMaxFileBytes) {
      setErrors([`Question pack files must be ${formatBytes(questionPackMaxFileBytes)} or smaller.`]);
      setImportStatus("invalid");
      input.value = "";
      return;
    }

    try {
      const parsed: unknown = JSON.parse(await file.text());
      previewPayload(parsed);
    } catch {
      setErrors(["Question pack file must contain valid JSON."]);
      setImportStatus("invalid");
    } finally {
      input.value = "";
    }
  }

  function previewPayload(payload: unknown) {
    setErrors([]);
    setPendingPack(undefined);

    const validation = validateQuestionPackPayload(payload);

    if (validation.status === "invalid") {
      setErrors(validation.errors);
      setImportStatus("invalid");
    } else {
      setPendingPack(validation.pack);
      setImportStatus("ready");
    }
  }

  async function handleInstall() {
    if (pendingPack === undefined) {
      return;
    }

    setImportStatus("saving");
    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      await saveQuestionPack(storage, pendingPack);
      setPacks((current) => sortPacks([...current.filter((pack) => pack.id !== pendingPack.id), pendingPack]));
      setPendingPack(undefined);
      setImportStatus("installed");
    } catch {
      setImportStatus("error");
    } finally {
      storage?.close();
    }
  }

  async function handleDelete(packId: string) {
    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      await deleteQuestionPack(storage, packId);
      setPacks((current) => current.filter((pack) => pack.id !== packId));
      setDeleteId(undefined);
    } catch {
      setImportStatus("error");
    } finally {
      storage?.close();
    }
  }

  return (
    <section className="grid gap-6" data-testid="settings-question-packs">
      <div className="grid gap-2 border-b border-ink/15 pb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-coral">{t("Custom Content")}</p>
        <h2 className="text-xl font-semibold text-ink">{t("Custom Content Packs")}</h2>
        <p className="text-sm leading-6 text-ink/65">
          {t("Build fixed numeric or case-questioning exercises here, or import a versioned pack for any supported practice area. Content stays in this browser and uses the app's deterministic local practice and progress engines.")}
        </p>
      </div>

      <QuestionPackBuilder onPreview={previewPayload} />
      <QuestioningPackBuilder onPreview={previewPayload} />

      <div className="grid gap-3 border border-ink/15 border-t-2 border-t-teal bg-paper p-4">
        <label className="grid gap-2 text-sm font-semibold text-ink/75">
          {t("Choose a question pack")}
          <input
            accept="application/json,.json,.mathdrill.json"
            className="block min-h-11 w-full text-sm text-ink file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-white file:px-3 file:text-sm file:font-semibold file:text-ink"
            onChange={(event) => void handleFile(event)}
            type="file"
          />
        </label>
        <p className="text-xs leading-5 text-ink/65">
          Maximum {formatBytes(questionPackMaxFileBytes)}. Import only original material or content you have
          permission to use.
        </p>
        <Link className={buttonClass("primary")} href="/content-packs/downloads">
          {t("Browse downloads and authoring resources")}
        </Link>
      </div>

      {pendingPack !== undefined && pendingPresentation !== undefined ? (
        <div className="grid gap-3 border border-teal/30 border-t-2 border-t-teal bg-mint/50 p-4" data-testid="question-pack-preview">
          <div className="grid gap-1">
            <p className="text-sm font-semibold text-ink">
              {t(replacing ? "Replace installed pack" : "Ready to install")}: {pendingPack.title}
            </p>
            <p className="text-sm leading-6 text-ink/65">
              Version {pendingPack.packVersion} · {pendingPresentation.itemSummary}
            </p>
            {pendingPack.description ? (
              <p className="text-sm leading-6 text-ink/70">{pendingPack.description}</p>
            ) : null}
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <PackPreviewStat label={t("Publisher")} value={pendingPack.publisher ?? t("Not provided")} />
            <PackPreviewStat label={t("License")} value={pendingPack.license ?? t("Not provided")} />
            <PackPreviewStat label={pendingPresentation.coverageLabel} value={pendingPresentation.coverageValue} />
          </dl>
          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Content preview")}</p>
            <PackItemPreview items={pendingPresentation.previewItems} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={buttonClass(replacing ? "danger" : "primary")}
              disabled={importStatus === "saving"}
              onClick={() => void handleInstall()}
              type="button"
            >
              {importStatus === "saving" ? t("Saving...") : t(replacing ? "Replace Pack" : "Install Pack")}
            </button>
            <button
              className={buttonClass("secondary")}
              onClick={() => downloadQuestionPack(pendingPack)}
              type="button"
            >
              Download .mathdrill.json
            </button>
            <button
              className={buttonClass("secondary")}
              onClick={() => {
                setPendingPack(undefined);
                setImportStatus("idle");
              }}
              type="button"
            >
              {t("Cancel")}
            </button>
          </div>
        </div>
      ) : null}

      <QuestionPackImportNotice errors={errors} status={importStatus} />

      <div className="grid gap-3">
        <div>
          <h3 className="text-base font-semibold text-ink">{t("Installed Packs")}</h3>
          <p className="text-sm leading-6 text-ink/65">
            Open specialized packs in their matching practice area. Numeric and generated packs start up to five
            unique questions; shorter packs and low-variation templates use every available question.
          </p>
        </div>
        {listStatus === "loading" ? <p className="rounded-md bg-paper px-3 py-2 text-sm">{t("Loading packs...")}</p> : null}
        {listStatus === "error" ? (
          <LocalSaveNotice detail={t("Installed question packs are unavailable.")} label={t("Question packs")} tone="error" />
        ) : null}
        {listStatus === "ready" && packs.length === 0 ? (
          <p className="border-s-2 border-ink/15 bg-paper px-3 py-2 text-sm leading-6 text-ink/65">{t("No question packs installed.")}</p>
        ) : null}
        {packs.map((pack) => (
          <QuestionPackCard
            deleting={deleteId === pack.id}
            key={pack.id}
            onCancelDelete={() => setDeleteId(undefined)}
            onConfirmDelete={() => void handleDelete(pack.id)}
            onRequestDelete={() => setDeleteId(pack.id)}
            pack={pack}
          />
        ))}
      </div>
    </section>
  );
}

function QuestionPackCard({
  deleting,
  onCancelDelete,
  onConfirmDelete,
  onRequestDelete,
  pack
}: {
  deleting: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onRequestDelete: () => void;
  pack: QuestionPackRecord;
}) {
  const { formatNumber: formatLocaleNumber, t } = useI18n();
  const counts = getQuestionPackDifficultyCounts(pack);
  const presentation = getPackPresentation(pack);
  const difficultyCounts = difficultyOrder.flatMap((difficulty) => {
    const count = counts[difficulty];
    return count === 0 ? [] : [{ count, difficulty }];
  });

  return (
    <article
      className="grid gap-3 border border-ink/15 border-t-2 border-t-teal bg-white p-4 transition-colors hover:border-ink/30 focus-within:border-teal"
      data-testid={`question-pack-${pack.id}`}
    >
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold text-ink">{pack.title}</h4>
          <span className={badgeClass("neutral")}>v{pack.packVersion}</span>
          <span className={badgeClass("neutral")}>
            {t(presentation.kindLabel)}
          </span>
        </div>
        {pack.publisher ? <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{pack.publisher}</p> : null}
        {pack.description ? <p className="text-sm leading-6 text-ink/65">{pack.description}</p> : null}
        {pack.license ? <p className="text-xs leading-5 text-ink/65">{t("Usage rights: {license}", { license: pack.license })}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {pack.kind === "fixed_numeric" || pack.kind === "generated_template" ? (
          difficultyCounts.map(({ count, difficulty }) => (
            <Link
              className={buttonClass("primary")}
              href={buildQuestionPackDrillHref(pack.id, difficulty, pack.kind === "fixed_numeric" ? Math.min(5, count) : 5)}
              key={difficulty}
            >
              {t("Practice {difficulty} ({count})", { difficulty: t(difficulty), count: formatLocaleNumber(count) })}
            </Link>
          ))
        ) : (
          <Link
            className={buttonClass("primary")}
            href={`${presentation.route}?pack=${encodeURIComponent(pack.id)}`}
          >
            {t("Open {kind}", { kind: t(presentation.kindLabel) })}
          </Link>
        )}
      </div>
      {deleting ? (
        <div className="flex flex-wrap items-center gap-2 border-s-2 border-coral bg-coral/10 p-3">
          <p className="w-full text-sm text-ink">{t("Remove this local pack? Completed session history will remain.")}</p>
          <button className={buttonClass("danger")} onClick={onConfirmDelete} type="button">
            {t("Remove Pack")}
          </button>
          <button className={buttonClass("secondary")} onClick={onCancelDelete} type="button">
            {t("Cancel")}
          </button>
        </div>
      ) : (
        <button
          className="w-fit text-sm font-semibold text-coral underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
          onClick={onRequestDelete}
          type="button"
        >
          {t("Remove local pack")}
        </button>
      )}
    </article>
  );
}

function QuestionPackImportNotice({ errors, status }: { errors: string[]; status: ImportStatus }) {
  const { formatNumber: formatLocaleNumber, t } = useI18n();
  const handoff = buildQuestionPackRepairHandoff(errors);
  const [copyResult, setCopyResult] = useState<{
    handoff: string;
    status: "copied" | "failed" | "unavailable";
  }>();
  const copyStatus = copyResult?.handoff === handoff ? copyResult.status : undefined;

  async function handleCopyErrors() {
    if (typeof navigator.clipboard?.writeText !== "function") {
      setCopyResult({ handoff, status: "unavailable" });
      return;
    }

    try {
      await navigator.clipboard.writeText(handoff);
      setCopyResult({ handoff, status: "copied" });
    } catch {
      setCopyResult({ handoff, status: "failed" });
    }
  }

  if (status === "idle" || status === "ready" || status === "saving") {
    return null;
  }

  if (status === "invalid") {
    const visibleErrors = errors.slice(0, 20);

    return (
      <section
        aria-labelledby="question-pack-errors-heading"
        className="grid gap-2 border border-coral/30 border-s-2 border-s-coral bg-coral/10 px-3 py-3"
        role="alert"
      >
        <p className="text-sm font-semibold text-ink" id="question-pack-errors-heading">
          {t("Fix {count} {problems} before importing", { count: formatLocaleNumber(errors.length), problems: t(errors.length === 1 ? "problem" : "problems") })}
        </p>
        <ol className="grid gap-1 pl-5 text-sm leading-6 text-ink/75">
          {visibleErrors.map((error, index) => (
            <li className="list-decimal" key={`${index}:${error}`}>
              {t(formatQuestionPackError(error))}
            </li>
          ))}
        </ol>
        {errors.length > visibleErrors.length ? (
          <p className="text-xs text-ink/65">{t("Showing the first {count} problems.", { count: formatLocaleNumber(visibleErrors.length) })}</p>
        ) : null}
        <div className="grid justify-items-start gap-2">
          <button className={buttonClass("secondary")} onClick={() => void handleCopyErrors()} type="button">
            {t("Copy all validation errors")}
          </button>
          {copyStatus !== undefined ? (
            <p aria-live="polite" className="text-xs leading-5 text-ink/75" role="status">
              {t(
                copyStatus === "copied"
                  ? "Copied. Attach the original package and paste this repair handoff into your AI chat."
                  : copyStatus === "unavailable"
                    ? "Clipboard access is unavailable in this browser."
                    : "Could not copy validation errors. Check clipboard permission and try again."
              )}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <LocalSaveNotice
      detail={t(status === "installed" ? "Question pack installed on this device." : "Question pack could not be saved.")}
      label={t("Question pack")}
      tone={status === "error" ? "error" : "success"}
    />
  );
}

function PackPreviewStat({ label, value }: { label: string; value: string }) {
  const { t } = useI18n();
  return (
    <div className="border-s-2 border-teal/30 bg-white px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t(label)}</dt>
      <dd className="mt-1 font-semibold text-ink">{t(value)}</dd>
    </div>
  );
}

function PackItemPreview({ items }: { items: readonly PackPreviewItem[] }) {
  return (
    <>
      <ol className="grid gap-2" data-testid="question-pack-question-preview">
        {items.slice(0, 3).map((item, index) => (
          <li className="border border-ink/15 bg-white px-3 py-3 text-sm" key={item.id}>
            <p className="font-semibold leading-6 text-ink">
              {index + 1}. {item.prompt}
            </p>
            <p className="mt-1 text-xs leading-5 text-ink/65">{item.detail}</p>
          </li>
        ))}
      </ol>
      {items.length > 3 ? <p className="text-xs text-ink/65">Plus {items.length - 3} more items.</p> : null}
    </>
  );
}

interface PackPreviewItem {
  detail: string;
  id: string;
  prompt: string;
}

interface PackPresentation {
  coverageLabel: string;
  coverageValue: string;
  itemSummary: string;
  kindLabel: string;
  previewItems: PackPreviewItem[];
  route?: string;
}

function getPackPresentation(pack: QuestionPackRecord): PackPresentation {
  const info = packKindInfo[pack.kind];
  const counts = getQuestionPackDifficultyCounts(pack);
  const common = {
    coverageLabel: "Difficulties",
    coverageValue: difficultyOrder.filter((difficulty) => counts[difficulty] > 0).map(formatLabel).join(", "),
    kindLabel: info.label,
    route: "route" in info ? info.route : undefined
  };

  if (pack.kind === "fixed_numeric") {
    return {
      ...common,
      itemSummary: `${pack.questions.length} questions`,
      previewItems: pack.questions.map((question) => ({
        detail: `${formatLabel(question.category)} · ${formatLabel(question.difficulty)} · Answer: ${formatPackAnswer(question.answer.value, question.answer.unit)}`,
        id: question.id,
        prompt: question.prompt
      }))
    };
  }
  if (pack.kind === "generated_template") {
    return {
      ...common,
      itemSummary: `${pack.templates.length} generated templates`,
      previewItems: pack.templates.map((template) => ({
        detail: `${formatLabel(template.category)} · ${template.difficulty.map(formatLabel).join(", ")} · ${Object.keys(template.variables).length} variables`,
        id: template.id,
        prompt: template.promptTemplate
      }))
    };
  }
  if (pack.kind === "case_practice") {
    const contentCounts = [
      { count: pack.structuringPrompts?.length ?? 0, label: "Structuring" },
      { count: pack.brainstormingPrompts?.length ?? 0, label: "Brainstorming" },
      { count: pack.synthesisPrompts?.length ?? 0, label: "Synthesis" },
      { count: pack.lessons?.length ?? 0, label: "Lessons" },
      { count: pack.fitPrompts?.length ?? 0, label: "Fit" },
      { count: pack.questioningPrompts?.length ?? 0, label: "Questioning" },
      { count: pack.fullCases?.length ?? 0, label: "Full cases" }
    ].filter(({ count }) => count > 0);
    const count = contentCounts.reduce((total, content) => total + content.count, 0);
    return {
      ...common,
      coverageLabel: "Modules",
      coverageValue: contentCounts.map((content) => `${content.label} (${content.count})`).join(", "),
      itemSummary: `${count} case-practice ${count === 1 ? "exercise" : "exercises"}`,
      previewItems: [
        ...(pack.structuringPrompts ?? []).map((prompt) => ({
          detail: `Structuring · ${formatLabel(prompt.industry)}`,
          id: prompt.id,
          prompt: prompt.title
        })),
        ...(pack.brainstormingPrompts ?? []).map((prompt) => ({
          detail: `Brainstorming · ${prompt.themes.length} themes`,
          id: prompt.id,
          prompt: prompt.title
        })),
        ...(pack.synthesisPrompts ?? []).map((prompt) => ({
          detail: `Synthesis · ${prompt.facts.length} facts`,
          id: prompt.id,
          prompt: prompt.title
        })),
        ...(pack.lessons ?? []).map((lesson) => ({
          detail: `Concept lesson · ${formatLabel(lesson.topic)}`,
          id: lesson.id,
          prompt: lesson.title
        })),
        ...(pack.fitPrompts ?? []).map((prompt) => ({
          detail: `Fit practice · ${formatLabel(prompt.competency)}`,
          id: prompt.id,
          prompt: prompt.prompt
        })),
        ...(pack.questioningPrompts ?? []).map((prompt) => ({
          detail: `Questioning · ${prompt.intents.length} rubric themes`,
          id: prompt.id,
          prompt: prompt.title
        })),
        ...(pack.fullCases ?? []).map((fullCase) => ({
          detail: `Full case · ${fullCase.client}`,
          id: fullCase.id,
          prompt: fullCase.title
        }))
      ]
    };
  }
  if (pack.kind === "exhibit") {
    return {
      ...common,
      itemSummary: `${pack.datasets.length} exhibit datasets`,
      previewItems: pack.datasets.map((dataset) => ({
        detail: `${formatLabel(dataset.visualization.type)} · ${dataset.rows.length} rows · ${dataset.questions.length} questions`,
        id: dataset.id,
        prompt: dataset.title
      }))
    };
  }
  if (pack.kind === "market_sizing") {
    return {
      ...common,
      itemSummary: `${pack.templates.length} market-sizing exercises`,
      previewItems: pack.templates.map((template) => ({
        detail: `${formatLabel(template.industry)} · ${formatLabel(template.difficulty)} · ${template.inputSteps.length} guided steps`,
        id: template.id,
        prompt: template.title
      }))
    };
  }
  return {
    ...common,
    itemSummary: `${pack.benchmarks.length} benchmarks`,
    previewItems: pack.benchmarks.map((benchmark) => ({
      detail: `${formatLabel(benchmark.difficulty)} · ${benchmark.questions.length} questions · ${benchmark.totalSessionSeconds}s`,
      id: benchmark.id,
      prompt: benchmark.title
    }))
  };
}

function formatPackAnswer(value: number, unit: UnitType | undefined): string {
  if (unit === "currency") return `$${formatNumber(value)}`;
  if (unit === "percentage") return `${formatNumber(value * 100)}%`;
  if (unit === undefined || unit === "none") return formatNumber(value);
  return `${formatNumber(value)} ${formatLabel(unit)}`;
}

function formatQuestionPackError(error: string): string {
  const questionError = error.match(/^\$\.questions\[(\d+)\]\.(.+)$/);

  if (questionError !== null) {
    return `Question ${Number(questionError[1]) + 1} · ${formatErrorField(questionError[2])}`;
  }

  return error.startsWith("$.") ? `Pack · ${formatErrorField(error.slice(2))}` : error;
}

function buildQuestionPackRepairHandoff(errors: readonly string[]): string {
  return [
    "Math Drill question pack repair handoff",
    "",
    "The Math Drill webapp importer is authoritative. Attach the original .mathdrill.json package to your AI chat, fix every exact importer error below, preserve valid content, and return only one complete corrected .mathdrill.json file.",
    `Importer file-size limit: ${formatBytes(questionPackMaxFileBytes)}.`,
    "Do not omit or paraphrase any error.",
    "",
    `Exact validation errors (${errors.length}):`,
    ...errors.map((error, index) => `${index + 1}. ${error}`)
  ].join("\n");
}

function formatErrorField(value: string): string {
  const [field, ...message] = value.split(" ");
  const readableField = field
    .replace(/\[(\d+)\]/g, (_, index: string) => ` ${Number(index) + 1}`)
    .replaceAll(".", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  const readable = [readableField, ...message].join(" ");

  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

function sortPacks(packs: QuestionPackRecord[]): QuestionPackRecord[] {
  return [...packs].sort((first, second) => first.title.localeCompare(second.title) || first.id.localeCompare(second.id));
}

function formatBytes(bytes: number): string {
  return `${bytes / 1024 / 1024} MiB`;
}

function downloadQuestionPack(pack: QuestionPackRecord): void {
  const url = URL.createObjectURL(new Blob([serializeQuestionPack(pack)], { type: "application/json" }));
  const link = document.createElement("a");

  link.href = url;
  link.download = `${pack.id}.mathdrill.json`;
  link.click();
  URL.revokeObjectURL(url);
}
