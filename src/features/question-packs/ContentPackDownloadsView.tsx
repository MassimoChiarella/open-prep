"use client";

import type { DownloadViewGroup } from "@/app/content-packs/downloads/page";
import { badgeClass, buttonClass, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";

export function ContentPackDownloadsView({ groups }: { groups: readonly DownloadViewGroup[] }) {
  const { t } = useI18n();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <a className="w-fit text-sm font-semibold text-teal underline-offset-4 hover:underline" href="/settings">
        <span aria-hidden="true">← </span>{t("Back to Settings")}
      </a>

      <header className="grid min-w-0 overflow-hidden border-y border-ink/20 bg-white lg:grid-cols-12">
        <div className="grid min-w-0 gap-5 px-5 py-7 sm:px-7 sm:py-9 lg:col-span-7">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="font-mono text-xs font-semibold text-ink/45">01</span>
            <span aria-hidden="true" className="h-px w-8 bg-coral" />
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-teal">{t("Content packs")}</p>
          </div>
          <h1 className="break-words text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-ink [overflow-wrap:anywhere] sm:text-5xl">
            {t("Download authoring resources")}
          </h1>
        </div>
        <div className="grid min-w-0 content-center border-t border-ink/15 px-5 py-7 sm:px-7 lg:col-span-5 lg:border-s lg:border-t-0">
          <p className="min-w-0 max-w-md break-words text-base leading-7 text-ink/70">
            {t("For AI-assisted authoring, choose one recommended family bundle and attach that single file with your authorized source material. Package imports remain deterministic and local to this browser.")}
          </p>
        </div>
      </header>

      {groups.map((group, index) => (
        <DownloadSection group={group} index={index} key={group.id} />
      ))}
    </main>
  );
}

function DownloadSection({ group, index }: { group: DownloadViewGroup; index: number }) {
  const { t } = useI18n();
  const headingId = `${group.id}-heading`;

  return (
    <section aria-labelledby={headingId} className="grid gap-4">
      <div className="grid gap-2 border-b border-ink/15 pb-4 sm:grid-cols-[2rem_minmax(0,1fr)] sm:gap-x-3">
        <span aria-hidden="true" className="font-mono text-xs font-semibold text-coral sm:pt-2">
          {String(index + 2).padStart(2, "0")}
        </span>
        <div className="grid gap-2">
          <h2 className="text-2xl font-semibold text-ink" id={headingId}>{t(group.title)}</h2>
          <p className={uiText.body}>{t(group.description)}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.assets.map((asset) => {
          const name = t(asset.name);

          return (
            <article
              className="flex min-h-56 flex-col gap-3 border border-ink/15 border-t-2 border-t-teal bg-white p-5 transition-colors hover:border-ink/30 focus-within:border-teal sm:p-6"
              key={asset.href}
            >
              <span className={badgeClass("neutral")}>{t(asset.type)}</span>
              <h3 className="text-lg font-semibold text-ink">{name}</h3>
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
