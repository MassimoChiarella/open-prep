"use client";

import type { DownloadViewGroup } from "@/app/content-packs/downloads/page";
import { badgeClass, buttonClass, cx, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";

const authoringSteps = [
  ["Choose", "Start with a guided builder or the closest editable starter."],
  ["Edit", "Replace the sample material and keep IDs, references, units, and formulas consistent."],
  ["Validate", "Open Import and run the file through Open Prep's canonical checks."],
  ["Review", "Check every fact, answer, explanation, source, accessibility choice, and right to distribute."],
  ["Test", "Install the pack locally, open it from Installed, and complete its practice flow."],
  ["License", "Choose an approved content license and record accurate rights and provenance evidence."],
  ["Submit", "Follow the content policy and community lifecycle linked from Resources."]
] as const;

const hubLinks = [
  ["Create", "/content-packs/?view=create"],
  ["Import", "/content-packs/?view=import"],
  ["Installed", "/content-packs/?view=installed"],
  ["Resources", "/content-packs/?view=resources"]
] as const;

const externalToolTrustCopy = "External tools are outside Open Prep. Material submitted to them leaves the local app. Share only material you have the rights to share, and do not submit confidential or personal data. Review every fact, answer, formula, unit, rubric, explanation, source, accessibility choice, and rights declaration yourself. The Open Prep importer is authoritative.";

interface ContentPackDownloadsViewProps {
  groups: readonly DownloadViewGroup[];
  optionalGroups: readonly DownloadViewGroup[];
}

export function ContentPackDownloadsView({ groups, optionalGroups }: ContentPackDownloadsViewProps) {
  const { t } = useI18n();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <a className="w-fit text-sm font-semibold text-teal underline-offset-4 hover:underline" href="/content-packs/?view=resources">
        <span aria-hidden="true">← </span>{t("Back to Content Packs")}
      </a>

      <header className="grid min-w-0 overflow-hidden border-y border-ink/20 bg-white lg:grid-cols-12">
        <div className="grid min-w-0 gap-5 px-5 py-7 sm:px-7 sm:py-9 lg:col-span-7">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="font-mono text-xs font-semibold text-ink/45">01</span>
            <span aria-hidden="true" className="h-px w-8 bg-coral" />
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-teal">{t("Content packs")}</p>
          </div>
          <h1 className="break-words text-4xl font-semibold leading-[1.05] text-ink [overflow-wrap:anywhere] sm:text-5xl">
            {t("Download authoring resources")}
          </h1>
        </div>
        <div className="grid min-w-0 content-center border-t border-ink/15 px-5 py-7 sm:px-7 lg:col-span-5 lg:border-s lg:border-t-0">
          <p className="min-w-0 max-w-md break-words text-base leading-7 text-ink/70">
            {t("Create content with guided tools or editable examples, then validate and test it locally before sharing.")}
          </p>
        </div>
      </header>

      <HumanAuthoringPath />

      {groups.map((group, index) => (
        <DownloadSection group={group} index={index + 3} key={group.id} />
      ))}

      <details className="group min-w-0 border-y border-ink/20 bg-white" data-testid="optional-external-tools">
        <summary className="cursor-pointer px-5 py-5 text-lg font-semibold text-ink marker:text-coral focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal sm:px-7">
          {t("Optional external-tool materials")}
        </summary>
        <div className="grid min-w-0 gap-7 border-t border-ink/15 px-5 py-6 sm:px-7">
          <p className={cx(uiText.body, "max-w-4xl")}>{t(externalToolTrustCopy)}</p>
          {optionalGroups.map((group, index) => (
            <DownloadSection group={group} index={index + groups.length + 3} key={group.id} />
          ))}
        </div>
      </details>
    </main>
  );
}

function HumanAuthoringPath() {
  const { t } = useI18n();

  return (
    <section aria-labelledby="human-authoring-path-heading" className="grid min-w-0 gap-5" data-testid="human-authoring-path">
      <div className="grid gap-2 border-b border-ink/15 pb-4 sm:grid-cols-[2rem_minmax(0,1fr)] sm:gap-x-3">
        <span aria-hidden="true" className="font-mono text-xs font-semibold text-coral sm:pt-2">02</span>
        <div className="grid gap-2">
          <h2 className="text-2xl font-semibold text-ink" id="human-authoring-path-heading">{t("Create a content pack")}</h2>
          <p className={uiText.body}>{t("Use one human workflow across every supported content family.")}</p>
        </div>
      </div>

      <ol className="grid min-w-0 gap-px bg-ink/15 sm:grid-cols-2 lg:grid-cols-4">
        {authoringSteps.map(([label, description], index) => (
          <li className="grid min-w-0 gap-2 bg-white p-4" key={label}>
            <span className="font-mono text-xs font-semibold text-coral">{String(index + 1).padStart(2, "0")}</span>
            <strong className="text-base text-ink">{t(label)}</strong>
            <span className={cx(uiText.body, "break-words [overflow-wrap:anywhere]")}>{t(description)}</span>
          </li>
        ))}
      </ol>

      <nav aria-label={t("Content pack authoring actions")} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {hubLinks.map(([label, href]) => (
          <a className={buttonClass("secondary")} href={href} key={href}>{t(label)}</a>
        ))}
      </nav>

      <div className="grid gap-2 border-s-2 border-coral bg-coral/10 px-4 py-3 text-sm leading-6 text-ink/75">
        <p>{t("Structural validation checks file shape and deterministic runtime safety. It cannot prove factual truth, ownership or permission, accessibility, answer-key quality, teaching quality, or catalog review.")}</p>
        <p>{t("All downloads use same-origin links and can remain available offline after a successful first access.")}</p>
      </div>
    </section>
  );
}

function DownloadSection({ group, index }: { group: DownloadViewGroup; index: number }) {
  const { t } = useI18n();
  const headingId = `${group.id}-heading`;

  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-4" data-download-group={group.id}>
      <div className="grid gap-2 border-b border-ink/15 pb-4 sm:grid-cols-[2rem_minmax(0,1fr)] sm:gap-x-3">
        <span aria-hidden="true" className="font-mono text-xs font-semibold text-coral sm:pt-2">
          {String(index).padStart(2, "0")}
        </span>
        <div className="grid gap-2">
          <h2 className="text-2xl font-semibold text-ink" id={headingId}>{t(group.title)}</h2>
          <p className={uiText.body}>{t(group.description)}</p>
        </div>
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.assets.map((asset) => {
          const name = t(asset.name);

          return (
            <article
              className="flex min-h-52 min-w-0 flex-col gap-3 border border-ink/15 border-t-2 border-t-teal bg-white p-5 transition-colors hover:border-ink/30 focus-within:border-teal sm:p-6"
              key={asset.href}
            >
              <span className={badgeClass("neutral")}>{t(asset.type)}</span>
              <h3 className="break-words text-lg font-semibold text-ink [overflow-wrap:anywhere]">{name}</h3>
              <code className="break-all text-xs leading-5 text-ink/55">{asset.href.slice(1).split("?")[0]}</code>
              <a
                aria-label={t("Download {name}", { name })}
                className={buttonClass("secondary", "mt-auto")}
                download={asset.downloadName ?? true}
                href={asset.href}
              >
                {t("Download {name}", { name })}
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}
