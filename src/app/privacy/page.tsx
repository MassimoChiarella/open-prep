import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Privacy and data",
  description: "How OpenPrep stores practice data on your device and uses limited website analytics."
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8" dir="ltr" lang="en">
      <PageHeader
        eyebrow="About OpenPrep"
        title="Privacy and data"
        description="Your practice stays on your device. This page explains local storage, backups, and website analytics."
      />
      <section className="grid gap-3 text-sm leading-7 text-ink/80" aria-labelledby="local-data-heading">
        <h2 className="text-xl font-semibold text-ink" id="local-data-heading">Practice data stays in your browser</h2>
        <p>
          OpenPrep stores answers, scores, progress, settings, drafts, private stories, and imported content in this browser.
          It does not upload those records or use remote services to generate questions, grade answers, or make recommendations.
        </p>
        <p>
          Data belongs to this browser profile and website address. Another browser, device, or domain has a separate store.
          Clearing site data, using a shared browser profile, or browser storage eviction can affect your saved work.
        </p>
      </section>
      <section className="grid gap-3 text-sm leading-7 text-ink/80" aria-labelledby="backup-heading">
        <h2 className="text-xl font-semibold text-ink" id="backup-heading">Back up, move, or clear your data</h2>
        <p>
          Settings offers a Standard Progress Export and a Complete Backup with optional scopes for private text,
          imported packs, and preferences. These downloads are unencrypted JSON files. Anyone with the file can read
          the data you chose to include, so keep backups somewhere you trust.
        </p>
        <p>
          To move from an older Vercel address to openprep.app, create a backup at the old address, then restore it in
          Settings at openprep.app. Check the restored data before clearing the old copy. Settings also lets you clear
          personal data or all saved app data from the current browser.
        </p>
      </section>
      <section className="grid gap-3 text-sm leading-7 text-ink/80" aria-labelledby="analytics-heading">
        <h2 className="text-xl font-semibold text-ink" id="analytics-heading">Website analytics</h2>
        <p>
          On openprep.app, Vercel Web Analytics counts visits to public app routes. Reported page URLs have their query
          strings and fragments removed. Custom events are disabled. Analytics does not read your saved practice data,
          imported content, answers, or settings.
        </p>
        <p>
          Vercel processes visit information such as referrals, browser, device, country, and visitor counts. Its Web
          Analytics service does not use tracking cookies. The hosting provider also receives ordinary requests for
          website files. See{" "}
          <a className="font-semibold text-teal underline underline-offset-4" href="https://vercel.com/docs/analytics/privacy-policy" rel="noreferrer">
            Vercel&apos;s analytics privacy documentation
          </a>{" "}
          for details.
        </p>
        <p>
          Analytics stays off when your browser enables Do Not Track or is offline. It also stays off on preview and
          local development addresses. Practice and local saving continue if analytics is unavailable.
        </p>
      </section>
      <Link className="inline-flex min-h-11 w-fit items-center font-semibold text-teal underline underline-offset-4" href="/settings/">
        Manage local data in Settings
      </Link>
    </main>
  );
}
