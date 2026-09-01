"use client";

import { useEffect, useId, useState } from "react";

import packageMetadata from "../../../package.json";
import { badgeClass, buttonClass, cx, panelClass, uiInputs, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  communityPackCatalogDifficulties,
  communityPackCatalogKinds,
  communityPackCatalogTopics,
  communityPackContentLicenseIds,
  type CommunityPackCatalog,
  type CommunityPackCatalogEntry
} from "@/features/question-packs/communityPackCatalog";
import {
  CommunityPackCatalogLoadError,
  defaultCommunityPackCatalogFilters,
  filterCommunityPackCatalogEntries,
  isCommunityPackCompatible,
  loadCommunityPackCatalog,
  type CommunityPackCatalogFetch,
  type CommunityPackCatalogFilters
} from "@/features/question-packs/communityPackCatalogClient";

interface CommunityPackDiscoverProps {
  appVersion?: string;
  fetchImpl?: CommunityPackCatalogFetch;
  now?: Date;
  onSelect: (entry: CommunityPackCatalogEntry) => void;
}

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; catalog: CommunityPackCatalog }
  | { status: "error" | "offline" | "unavailable" };

const kindLabels: Record<CommunityPackCatalogEntry["kind"], string> = {
  benchmark: "Benchmark",
  case_practice: "Case practice",
  exhibit: "Exhibit",
  fixed_numeric: "Fixed numeric",
  generated_template: "Generated template",
  market_sizing: "Market sizing"
};

const topicLabels: Record<CommunityPackCatalogEntry["topics"][number], string> = {
  arithmetic: "Arithmetic",
  brainstorming: "Brainstorming",
  business_math: "Business math",
  case_math: "Case math",
  exhibit_math: "Exhibit math",
  fit: "Fit",
  fractions_decimals_ratios: "Fractions, decimals, and ratios",
  full_case: "Full case",
  growth_compounding: "Growth and compounding",
  lessons: "Lessons",
  market_sizing: "Market sizing",
  percentages: "Percentages",
  questioning: "Questioning",
  structuring: "Structuring",
  synthesis: "Synthesis",
  weighted_averages: "Weighted averages"
};

const difficultyLabels: Record<CommunityPackCatalogEntry["difficulties"][number], string> = {
  advanced: "Advanced",
  beginner: "Beginner",
  expert: "Expert",
  intermediate: "Intermediate"
};

export function CommunityPackDiscover({
  appVersion = packageMetadata.version,
  fetchImpl,
  now,
  onSelect
}: CommunityPackDiscoverProps) {
  const { formatDate, formatNumber, locale, t } = useI18n();
  const filterId = useId();
  const [filters, setFilters] = useState<CommunityPackCatalogFilters>(() => ({
    ...defaultCommunityPackCatalogFilters
  }));
  const [loadedAt] = useState(() => now ?? new Date());
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    void loadCommunityPackCatalog(fetchImpl).then((catalog) => {
      if (active) setLoadState({ status: "loaded", catalog });
    }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof CommunityPackCatalogLoadError && error.kind === "unavailable") {
        setLoadState({ status: "unavailable" });
      } else if (
        error instanceof CommunityPackCatalogLoadError &&
        error.kind === "network" &&
        typeof navigator !== "undefined" &&
        navigator.onLine === false
      ) {
        setLoadState({ status: "offline" });
      } else {
        setLoadState({ status: "error" });
      }
    });

    return () => {
      active = false;
    };
  }, [fetchImpl, loadAttempt]);

  if (loadState.status !== "loaded") {
    return (
      <CatalogLoadState
        onRetry={loadState.status === "loading" ? undefined : () => {
          setLoadState({ status: "loading" });
          setLoadAttempt((value) => value + 1);
        }}
        status={loadState.status}
      />
    );
  }

  if (loadState.catalog.entries.length === 0) {
    return (
      <section className={panelClass("default", "grid min-w-0 gap-2")} data-state="empty">
        <p className={badgeClass("neutral")}>{t("Empty")}</p>
        <h3 className={uiText.subsectionTitle}>{t("No reviewed community packs yet")}</h3>
        <p className={uiText.body}>
          {t("Community packs will appear here after repository review and catalog publication.")}
        </p>
      </section>
    );
  }

  const referenceDate = now ?? loadedAt;
  const entries = loadState.catalog.entries;
  const filteredEntries = filterCommunityPackCatalogEntries(entries, filters, appVersion, referenceDate);
  const filterOptions = catalogFilterOptions(entries);
  const filtersActive = Object.values(filters).some((value) => value !== "");
  const updateFilter = <Key extends keyof CommunityPackCatalogFilters>(
    key: Key,
    value: CommunityPackCatalogFilters[Key]
  ) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-6" data-testid="community-pack-discover">
      <section className={panelClass("subtle", "grid min-w-0 gap-4")} aria-labelledby={`${filterId}-heading`}>
        <div className="grid min-w-0 gap-1">
          <h3 className={uiText.subsectionTitle} id={`${filterId}-heading`}>{t("Filter reviewed packs")}</h3>
          <p className={uiText.dense}>{t("All filters run on this device against the downloaded static catalog.")}</p>
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CatalogSelect
            id={`${filterId}-kind`}
            label={t("Practice kind")}
            onChange={(value) => updateFilter("kind", value as CommunityPackCatalogFilters["kind"])}
            options={filterOptions.kinds.map((value) => ({ label: t(kindLabels[value]), value }))}
            value={filters.kind}
          />
          <CatalogSelect
            id={`${filterId}-topic`}
            label={t("Topic")}
            onChange={(value) => updateFilter("topic", value as CommunityPackCatalogFilters["topic"])}
            options={filterOptions.topics.map((value) => ({ label: t(topicLabels[value]), value }))}
            value={filters.topic}
          />
          <CatalogSelect
            id={`${filterId}-difficulty`}
            label={t("Difficulty")}
            onChange={(value) => updateFilter("difficulty", value as CommunityPackCatalogFilters["difficulty"])}
            options={filterOptions.difficulties.map((value) => ({ label: t(difficultyLabels[value]), value }))}
            value={filters.difficulty}
          />
          <CatalogSelect
            id={`${filterId}-language`}
            label={t("Content language")}
            onChange={(value) => updateFilter("language", value)}
            options={filterOptions.languages.map((value) => ({ label: displayLanguage(value, locale), value }))}
            value={filters.language}
          />
          <CatalogSelect
            id={`${filterId}-publisher`}
            label={t("Publisher")}
            onChange={(value) => updateFilter("publisher", value)}
            options={filterOptions.publishers.map(({ id, name }) => ({ label: name, value: id }))}
            value={filters.publisher}
          />
          <CatalogSelect
            id={`${filterId}-license`}
            label={t("Content license")}
            onChange={(value) => updateFilter("license", value as CommunityPackCatalogFilters["license"])}
            options={filterOptions.licenses.map((value) => ({ label: value, value }))}
            value={filters.license}
          />
          <CatalogSelect
            id={`${filterId}-compatibility`}
            label={t("Compatibility")}
            onChange={(value) => updateFilter("compatibility", value as CommunityPackCatalogFilters["compatibility"])}
            options={[
              { label: t("Compatible with this version"), value: "compatible" },
              { label: t("Requires a newer version"), value: "incompatible" }
            ]}
            value={filters.compatibility}
          />
          <CatalogSelect
            id={`${filterId}-recency`}
            label={t("Review recency")}
            onChange={(value) => updateFilter("reviewRecency", value as CommunityPackCatalogFilters["reviewRecency"])}
            options={[
              { label: t("Past 90 days"), value: "90" },
              { label: t("Past year"), value: "365" }
            ]}
            value={filters.reviewRecency}
          />
        </div>

        <button
          className={buttonClass("secondary")}
          disabled={!filtersActive}
          onClick={() => setFilters({ ...defaultCommunityPackCatalogFilters })}
          type="button"
        >
          {t("Reset filters")}
        </button>
      </section>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className={uiText.bodyStrong} role="status">
          {t("Showing {shown} of {total} repository-reviewed packs", {
            shown: formatNumber(filteredEntries.length),
            total: formatNumber(entries.length)
          })}
        </p>
        <p className={uiText.dense}>{t("Sorted by title")}</p>
      </div>

      {filteredEntries.length === 0 ? (
        <section className={panelClass("default", "grid min-w-0 gap-2")} data-state="empty">
          <p className={badgeClass("neutral")}>{t("No matches")}</p>
          <h3 className={uiText.subsectionTitle}>{t("No reviewed packs match these filters")}</h3>
          <p className={uiText.body}>{t("Reset the filters or broaden one selection.")}</p>
        </section>
      ) : (
        <ul className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2" data-testid="community-pack-results">
          {filteredEntries.map((entry) => (
            <CatalogResult
              appVersion={appVersion}
              entry={entry}
              formatDate={formatDate}
              key={`${entry.id}:${entry.version}`}
              onSelect={onSelect}
              t={t}
            />
          ))}
        </ul>
      )}

      <p className={panelClass("subtle", cx(uiText.dense, "py-3"))}>
        {t("Repository-reviewed status comes only from this version-controlled catalog. Structural validation and review do not guarantee ownership or factual accuracy; inspect each pack before installing it.")}
      </p>
    </div>
  );
}

function CatalogLoadState({
  onRetry,
  status
}: {
  onRetry?: () => void;
  status: Exclude<LoadState["status"], "loaded">;
}) {
  const { t } = useI18n();
  const copy = {
    error: {
      description: "The downloaded catalog did not pass validation. Try again after the catalog is corrected.",
      title: "Community pack catalog could not be loaded"
    },
    loading: {
      description: "Loading the same-origin static catalog.",
      title: "Loading reviewed community packs"
    },
    offline: {
      description: "Reconnect or retry after this catalog has been cached on this device.",
      title: "The community pack catalog is not available offline"
    },
    unavailable: {
      description: "The static catalog is not available from this installation.",
      title: "Community pack catalog unavailable"
    }
  }[status];

  return (
    <section
      aria-live={status === "loading" ? "polite" : undefined}
      className={panelClass(status === "error" ? "danger" : "default", "grid min-w-0 gap-2")}
      data-state={status}
      role={status === "error" ? "alert" : "status"}
    >
      <p className={badgeClass(status === "error" ? "error" : status === "offline" ? "warning" : "neutral")}>
        {t(status === "loading" ? "Loading" : status === "offline" ? "Offline" : status === "error" ? "Error" : "Unavailable")}
      </p>
      <h3 className={uiText.subsectionTitle}>{t(copy.title)}</h3>
      <p className={uiText.body}>{t(copy.description)}</p>
      {onRetry ? (
        <button className={buttonClass("secondary")} onClick={onRetry} type="button">{t("Try again")}</button>
      ) : null}
    </section>
  );
}

function CatalogSelect({
  id,
  label,
  onChange,
  options,
  value
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
  value: string;
}) {
  const { t } = useI18n();

  return (
    <label className="grid min-w-0 gap-1" htmlFor={id}>
      <span className={uiText.controlLabel}>{label}</span>
      <select
        className={uiInputs.compact}
        id={id}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      >
        <option value="">{t("All")}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function CatalogResult({
  appVersion,
  entry,
  formatDate,
  onSelect,
  t
}: {
  appVersion: string;
  entry: CommunityPackCatalogEntry;
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  onSelect: (entry: CommunityPackCatalogEntry) => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const compatible = isCommunityPackCompatible(entry, appVersion);

  return (
    <li className="min-w-0">
      <article
        className={panelClass("default", "grid h-full min-w-0 content-start gap-4")}
        data-compatible={compatible}
        data-deprecated={entry.deprecated}
      >
        <div className="flex min-w-0 flex-wrap gap-2">
          <span className={badgeClass("success")}>{t("Repository reviewed")}</span>
          {entry.deprecated ? <span className={badgeClass("warning")}>{t("Deprecated")}</span> : null}
          {!compatible ? <span className={badgeClass("warning")}>{t("Incompatible")}</span> : null}
        </div>

        <div className="grid min-w-0 gap-2">
          <h3 className={uiText.subsectionTitle}>{entry.title}</h3>
          <p className={cx(uiText.body, "min-w-0 break-words [overflow-wrap:anywhere]")}>{entry.summary}</p>
        </div>

        <dl className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 text-sm sm:grid-cols-2">
          <CatalogFact label={t("Publisher")} value={entry.publisher.name} />
          <CatalogFact label={t("Content license")} value={entry.contentLicenseId} />
          <CatalogFact label={t("Review date")} value={formatDate(`${entry.reviewDate}T00:00:00Z`, { dateStyle: "medium", timeZone: "UTC" })} />
          <CatalogFact label={t("Pack version")} value={entry.version} />
          <CatalogFact label={t("Practice kind")} value={t(kindLabels[entry.kind])} />
          <CatalogFact label={t("Compatibility")} value={compatible ? t("Compatible with this version") : t("Requires Open Prep {version} or newer", { version: entry.minimumAppVersion })} />
        </dl>

        <div className="grid min-w-0 gap-2">
          <p className={uiText.dense}>
            {t("Topics: {topics}", { topics: entry.topics.map((topic) => t(topicLabels[topic])).join(", ") })}
          </p>
          <p className={uiText.dense}>
            {t("Difficulty: {difficulty}", { difficulty: entry.difficulties.map((difficulty) => t(difficultyLabels[difficulty])).join(", ") })}
          </p>
        </div>

        {entry.deprecation ? (
          <p className={cx(uiText.dense, "border-s-2 border-saffron ps-3")}>
            {t("Deprecated on {date}: {reason}", {
              date: formatDate(`${entry.deprecation.date}T00:00:00Z`, { dateStyle: "medium", timeZone: "UTC" }),
              reason: entry.deprecation.reason
            })}
          </p>
        ) : null}

        <button
          className={buttonClass("primary", "mt-auto")}
          disabled={!compatible}
          onClick={() => onSelect(entry)}
          type="button"
        >
          {compatible ? t("Review pack") : t("Requires a newer version")}
        </button>
      </article>
    </li>
  );
}

function CatalogFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-s-2 border-ink/15 ps-3">
      <dt className={uiText.dense}>{label}</dt>
      <dd className="min-w-0 break-words font-medium text-ink [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

function catalogFilterOptions(entries: readonly CommunityPackCatalogEntry[]) {
  const presentKinds = new Set(entries.map((entry) => entry.kind));
  const presentTopics = new Set(entries.flatMap((entry) => entry.topics));
  const presentDifficulties = new Set(entries.flatMap((entry) => entry.difficulties));
  const presentLicenses = new Set(entries.map((entry) => entry.contentLicenseId));
  const publishers = new Map(entries.map((entry) => [entry.publisher.id, entry.publisher.name]));

  return {
    difficulties: communityPackCatalogDifficulties.filter((value) => presentDifficulties.has(value)),
    kinds: communityPackCatalogKinds.filter((value) => presentKinds.has(value)),
    languages: [...new Set(entries.map((entry) => entry.language))].sort(compareText),
    licenses: communityPackContentLicenseIds.filter((value) => presentLicenses.has(value)),
    publishers: [...publishers].map(([id, name]) => ({ id, name })).sort((left, right) => compareText(left.name, right.name) || compareText(left.id, right.id)),
    topics: communityPackCatalogTopics.filter((value) => presentTopics.has(value))
  };
}

function displayLanguage(language: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(language) ?? language;
  } catch {
    return language;
  }
}

function compareText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}
