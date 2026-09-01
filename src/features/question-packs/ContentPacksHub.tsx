"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { badgeClass, buttonClass, cx, panelClass, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";
import { ContentPackStarterLibrary } from "@/features/question-packs/ContentPackStarterLibrary";
import { CommunityPackDiscover } from "@/features/question-packs/CommunityPackDiscover";
import type { CommunityPackCatalogEntry } from "@/features/question-packs/communityPackCatalog";
import type { CommunityPackCatalogFetch } from "@/features/question-packs/communityPackCatalogClient";
import {
  CommunityPackDownloadError,
  fetchCommunityPackCandidate
} from "@/features/question-packs/communityPackInstaller";
import {
  QuestionPackManager,
  type QuestionPackImportCandidate
} from "@/features/question-packs/QuestionPackManager";

export const contentPacksViewIds = [
  "discover",
  "installed",
  "import",
  "create",
  "resources"
] as const;

export type ContentPacksView = (typeof contentPacksViewIds)[number];
export type ContentPacksStateKind = "empty" | "loading" | "error" | "offline" | "unavailable";

interface ContentPacksStateProps {
  description?: string;
  kind: ContentPacksStateKind;
  title?: string;
}

const viewDefinitions: ReadonlyArray<{
  description: string;
  id: ContentPacksView;
  label: string;
}> = [
  {
    description: "Browse community packs that have passed repository review.",
    id: "discover",
    label: "Discover"
  },
  {
    description: "Review practice packs stored in this browser.",
    id: "installed",
    label: "Installed"
  },
  {
    description: "Review a pack before storing it locally.",
    id: "import",
    label: "Import"
  },
  {
    description: "Create a pack from guided tools or editable examples.",
    id: "create",
    label: "Create"
  },
  {
    description: "Open authoring guides, format references, and community policies.",
    id: "resources",
    label: "Resources"
  }
];

const stateCopy: Record<ContentPacksStateKind, {
  description: string;
  label: string;
  title: string;
}> = {
  empty: {
    description: "There is nothing to show in this view yet.",
    label: "Empty",
    title: "No content packs here"
  },
  loading: {
    description: "Content pack information is loading.",
    label: "Loading",
    title: "Loading content packs"
  },
  error: {
    description: "Try opening this view again.",
    label: "Error",
    title: "Content packs could not be loaded"
  },
  offline: {
    description: "Reconnect to open content that has not been cached on this device.",
    label: "Offline",
    title: "This content is not available offline"
  },
  unavailable: {
    description: "Use another Content Packs view that is currently available.",
    label: "Unavailable",
    title: "This view is not available"
  }
};

const repositoryDocumentBase = "https://github.com/MassimoChiarella/open-prep/blob/main";

const resources = [
  {
    description: "Download schemas, starters, examples, and authoring references.",
    href: "/content-packs/downloads/",
    label: "Authoring downloads",
    type: "In app"
  },
  {
    description: "Choose a format, write original material, validate it, and import it.",
    href: "/question-pack-author-guide.md",
    label: "Human author guide",
    type: "Local document"
  },
  {
    description: "Read the complete fixed, generated, exhibit, sizing, benchmark, and v2 case contract.",
    href: `${repositoryDocumentBase}/QUESTION_PACK_FORMAT_V2.md`,
    label: "Question Pack Format v2",
    type: "Repository document"
  },
  {
    description: "Read the questioning and full-case package contract.",
    href: `${repositoryDocumentBase}/QUESTION_PACK_FORMAT_V3.md`,
    label: "Question Pack Format v3",
    type: "Repository document"
  },
  {
    description: "Review consulting relevance, rights, privacy, quality, and accessibility requirements.",
    href: `${repositoryDocumentBase}/CONTENT_POLICY.md`,
    label: "Content policy",
    type: "Repository document"
  },
  {
    description: "Review catalog submission, correction, withdrawal, and takedown rules.",
    href: `${repositoryDocumentBase}/COMMUNITY_PACK_LIFECYCLE.md`,
    label: "Community pack lifecycle",
    type: "Repository document"
  }
] as const;

export function parseContentPacksView(value: string | null | undefined): ContentPacksView {
  return contentPacksViewIds.find((view) => view === value) ?? "discover";
}

export function ContentPacksHub({
  catalogFetch,
  packFetch
}: {
  catalogFetch?: CommunityPackCatalogFetch;
  packFetch?: typeof fetch;
} = {}) {
  const { t } = useI18n();
  const activeView = parseContentPacksView(useSearchParams().get("view"));
  const activeDefinition = viewDefinitions.find((view) => view.id === activeView) ?? viewDefinitions[0];

  return (
    <main
      className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col gap-7 px-4 py-8 sm:px-6 lg:px-8"
      data-testid="content-packs-hub"
    >
      <PageHeader
        description="Find, import, create, and manage practice packs without an account."
        eyebrow="Practice library"
        title="Content Packs"
      />

      <nav aria-label={t("Content Pack views")} className="min-w-0 max-w-full">
        <ul
          className="grid min-w-0 max-w-full grid-cols-2 gap-px bg-ink/15 sm:grid-cols-5"
          data-testid="content-packs-view-list"
        >
          {viewDefinitions.map((view) => {
            const isActive = view.id === activeView;

            return (
              <li className="min-w-0 bg-paper" key={view.id}>
                <a
                  aria-current={isActive ? "page" : undefined}
                  className={cx(
                    "flex min-h-11 min-w-0 items-center justify-center bg-white px-3 py-2 text-center text-sm font-semibold text-ink transition-colors hover:bg-mint/45",
                    "break-words [overflow-wrap:anywhere]",
                    isActive && "bg-mint text-teal"
                  )}
                  href={`/content-packs/?view=${view.id}`}
                >
                  {t(view.label)}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <p className={panelClass("subtle", cx(uiText.body, "py-3"))}>
        {t("Packs are installed in this browser. Imported packs may be unreviewed. Offline access depends on whether a pack has been installed or cached.")}
      </p>

      <section
        aria-labelledby={`content-packs-${activeView}-heading`}
        className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-5"
        data-testid="content-packs-view"
      >
        <div className="grid min-w-0 max-w-3xl gap-2 border-b border-ink/20 pb-5 text-start">
          <h2 className={uiText.sectionTitle} id={`content-packs-${activeView}-heading`}>
            {t(activeDefinition.label)}
          </h2>
          <p className={cx(uiText.body, "min-w-0 break-words [overflow-wrap:anywhere]")}>
            {t(activeDefinition.description)}
          </p>
        </div>

        <ContentPacksViewContent catalogFetch={catalogFetch} packFetch={packFetch} view={activeView} />
      </section>
    </main>
  );
}

function ContentPacksViewContent({
  catalogFetch,
  packFetch,
  view
}: {
  catalogFetch?: CommunityPackCatalogFetch;
  packFetch?: typeof fetch;
  view: ContentPacksView;
}) {
  if (view === "discover") {
    return <CommunityPackDiscoverExperience catalogFetch={catalogFetch} packFetch={packFetch} />;
  }

  if (view === "resources") return <ResourcesView />;

  if (view === "create") {
    return (
      <div className="grid min-w-0 gap-8">
        <QuestionPackManager view="create" />
        <ContentPackStarterLibrary />
      </div>
    );
  }

  return <QuestionPackManager view={view} />;
}

type CatalogDownloadState =
  | { status: "idle" }
  | { entry: CommunityPackCatalogEntry; status: "loading" }
  | { candidate: QuestionPackImportCandidate; entry: CommunityPackCatalogEntry; status: "ready" }
  | {
      entry: CommunityPackCatalogEntry;
      reason: CommunityPackDownloadError["reason"];
      status: "error";
    };

function CommunityPackDiscoverExperience({
  catalogFetch,
  packFetch
}: {
  catalogFetch?: CommunityPackCatalogFetch;
  packFetch?: typeof fetch;
}) {
  const { t } = useI18n();
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const [download, setDownload] = useState<CatalogDownloadState>({ status: "idle" });

  useEffect(() => {
    if (download.status === "ready") previewHeading.current?.focus();
  }, [download.status]);

  async function selectEntry(entry: CommunityPackCatalogEntry) {
    setDownload({ entry, status: "loading" });
    try {
      const candidate = await fetchCommunityPackCandidate(entry, { fetcher: packFetch });
      setDownload({ candidate, entry, status: "ready" });
    } catch (error) {
      setDownload({
        entry,
        reason: error instanceof CommunityPackDownloadError ? error.reason : "unavailable",
        status: "error"
      });
    }
  }

  return (
    <div className="grid min-w-0 gap-8">
      <CommunityPackDiscover fetchImpl={catalogFetch} onSelect={(entry) => void selectEntry(entry)} />

      {download.status === "loading" ? (
        <ContentPacksState
          description="Verifying the exact catalog bytes before opening the install preview."
          kind="loading"
          title={`Verifying ${download.entry.title}`}
        />
      ) : null}

      {download.status === "error" ? (
        <section
          aria-labelledby="community-pack-download-error-heading"
          className={panelClass("danger", "grid min-w-0 gap-3")}
          role="alert"
        >
          <p className={badgeClass(download.reason === "offline" ? "warning" : "error")}>{t(download.reason === "offline" ? "Offline" : "Error")}</p>
          <h3 className={uiText.subsectionTitle} id="community-pack-download-error-heading">
            {t(download.reason === "integrity" || download.reason === "invalid"
              ? "Reviewed pack could not be verified"
              : download.reason === "offline"
                ? "Pack not available offline yet"
                : "Reviewed pack could not be downloaded")}
          </h3>
          <p className={uiText.body}>
            {t(download.reason === "integrity" || download.reason === "invalid"
              ? "Nothing was installed. The downloaded bytes did not match the repository-reviewed catalog record."
              : download.reason === "offline"
                ? "Reconnect and open this pack once so it can be cached for later offline use."
                : "Nothing was installed. Check the connection and try this reviewed pack again.")}
          </p>
          <button className={buttonClass("secondary")} onClick={() => void selectEntry(download.entry)} type="button">
            {t("Try again")}
          </button>
        </section>
      ) : null}

      {download.status === "ready" ? (
        <section className="grid min-w-0 gap-4 border-t border-ink/20 pt-6" aria-labelledby="community-pack-install-heading">
          <h3 className={uiText.subsectionTitle} id="community-pack-install-heading" ref={previewHeading} tabIndex={-1}>
            {t("Review and install {title}", { title: download.entry.title })}
          </h3>
          <QuestionPackManager catalogCandidate={download.candidate} view="import" />
        </section>
      ) : null}
    </div>
  );
}

export function ContentPacksState({ description, kind, title }: ContentPacksStateProps) {
  const { t } = useI18n();
  const headingId = useId();
  const copy = stateCopy[kind];

  return (
    <section
      aria-labelledby={headingId}
      aria-live={kind === "loading" ? "polite" : undefined}
      className={panelClass(kind === "error" ? "danger" : "default", "grid min-w-0 gap-2")}
      data-state={kind}
      data-testid="content-packs-state"
      role={kind === "error" ? "alert" : kind === "loading" ? "status" : undefined}
    >
      <p className={badgeClass(kind === "error" ? "error" : kind === "offline" ? "warning" : "neutral")}>
        {t(copy.label)}
      </p>
      <h3 className={uiText.subsectionTitle} id={headingId}>{t(title ?? copy.title)}</h3>
      <p className={cx(uiText.body, "min-w-0 break-words [overflow-wrap:anywhere]")}>
        {t(description ?? copy.description)}
      </p>
    </section>
  );
}

function ResourcesView() {
  const { t } = useI18n();

  return (
    <ul className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-px bg-ink/15 sm:grid-cols-2">
      {resources.map((resource) => (
        <li className="min-w-0 bg-white" key={resource.href}>
          <a
            className="grid h-full min-w-0 gap-2 p-4 text-start transition-colors hover:bg-mint/30 sm:p-5"
            href={resource.href}
          >
            <span className={badgeClass("neutral")}>{t(resource.type)}</span>
            <span className={uiText.subsectionTitle}>{t(resource.label)}</span>
            <span className={cx(uiText.body, "min-w-0 break-words [overflow-wrap:anywhere]")}>
              {t(resource.description)}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
