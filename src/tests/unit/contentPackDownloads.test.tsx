import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import ContentPackDownloadsPage from "@/app/content-packs/downloads/page";
import { I18nProvider } from "@/features/i18n/I18nProvider";
import { localePreferenceStorageKey } from "@/features/i18n/i18n";

afterEach(() => window.localStorage.clear());

const expectedGroups = {
  "Recommended one-file AI bundles": [
    "/math-drill-ai-pack-fixed-numeric-complete.md?revision=2026-08-29",
    "/math-drill-ai-pack-generated-template-complete.md?revision=2026-08-29",
    "/math-drill-ai-pack-exhibit-complete.md?revision=2026-08-29",
    "/math-drill-ai-pack-market-sizing-complete.md?revision=2026-08-29",
    "/math-drill-ai-pack-benchmark-complete.md?revision=2026-08-29",
    "/math-drill-ai-pack-case-practice-complete.md?revision=2026-08-29"
  ],
  "Advanced authoring references": [
    "/math-drill-ai-pack-authoring-start.md?revision=2026-08-29",
    "/math-drill-ai-pack-authoring-kit.md?revision=2026-08-29",
    "/question-pack-author-guide.md?revision=2026-08-29"
  ],
  "Advanced focused components": [
    "/math-drill-ai-pack-fixed-numeric-kit.md?revision=2026-08-29",
    "/math-drill-ai-pack-generated-template-kit.md?revision=2026-08-29",
    "/math-drill-ai-pack-exhibit-kit.md?revision=2026-08-29",
    "/math-drill-ai-pack-market-sizing-kit.md?revision=2026-08-29",
    "/math-drill-ai-pack-benchmark-kit.md?revision=2026-08-29",
    "/math-drill-ai-pack-case-practice-kit.md?revision=2026-08-29"
  ],
  "Schemas and starter": [
    "/question-pack-v2.schema.json",
    "/question-pack-v3.schema.json",
    "/question-pack-starter.mathdrill.json"
  ],
  "Examples and cookbooks": [
    "/question-pack-example.mathdrill.json",
    "/question-pack-template-example.mathdrill.json",
    "/question-pack-interview-math-example.mathdrill.json",
    "/question-pack-exhibit-example.mathdrill.json",
    "/question-pack-chart-example.mathdrill.json",
    "/question-pack-visualization-cookbook.mathdrill.json",
    "/question-pack-market-sizing-example.mathdrill.json",
    "/question-pack-market-sizing-cookbook.mathdrill.json",
    "/question-pack-benchmark-example.mathdrill.json",
    "/question-pack-case-practice-example.mathdrill.json",
    "/question-pack-case-questioning-example.mathdrill.json",
    "/question-pack-v3-full-case-example.mathdrill.json"
  ]
} as const;

describe("ContentPackDownloadsPage", () => {
  it("groups every authoring asset behind same-origin download links", () => {
    render(<ContentPackDownloadsPage />);

    expect(screen.getByRole("link", { name: "Back to Settings" })).toHaveAttribute("href", "/settings");

    for (const [groupName, expectedHrefs] of Object.entries(expectedGroups)) {
      const group = screen.getByRole("region", { name: groupName });
      const links = within(group).getAllByRole("link", { name: /^Download / });

      expect(links.map((link) => link.getAttribute("href"))).toEqual(expectedHrefs);
      for (const link of links) {
        expect(link).toHaveAttribute("download");
        expect(link.getAttribute("href")).toMatch(/^\//);
      }
    }

    expect(screen.getByRole("link", { name: "Download AI Start Here component" })).toHaveAttribute(
      "download",
      "math-drill-ai-pack-authoring-start-2026-08-29.md"
    );
    expect(screen.getByRole("link", { name: "Download Complete all-family AI authoring kit" })).toHaveAttribute(
      "download",
      "math-drill-ai-pack-authoring-kit-2026-08-29.md"
    );

    const recommended = screen.getByRole("region", { name: "Recommended one-file AI bundles" });
    const recommendedLinks = within(recommended).getAllByRole("link", { name: /^Download / });
    expect(recommendedLinks).toHaveLength(6);
    for (const link of recommendedLinks) {
      expect(link.getAttribute("download")).toMatch(/-2026-08-29\.md$/);
    }
    expect(within(recommended).getByText(/no second file is needed/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Advanced focused components" })).toHaveTextContent(
      "not self-contained attachments"
    );

    const publicPackages = readdirSync(resolve(process.cwd(), "public"))
      .filter((fileName) => fileName.endsWith(".mathdrill.json"))
      .map((fileName) => `/${fileName}`)
      .sort();
    const listedPackages = screen
      .getAllByRole("link", { name: /^Download / })
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => href?.endsWith(".mathdrill.json") === true)
      .sort();

    expect(listedPackages).toEqual(publicPackages);
  });

  it("localizes the complete download chrome and accessible link names", async () => {
    window.localStorage.setItem(localePreferenceStorageKey, "ar");
    render(<I18nProvider><ContentPackDownloadsPage /></I18nProvider>);

    await waitFor(() => expect(screen.getByRole("heading", { name: "تنزيل موارد التأليف" })).toBeInTheDocument());
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("region", { name: "حزم ذكاء اصطناعي موصى بها بملف واحد" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "العودة إلى الإعدادات" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "تنزيل حزمة رقمية ثابتة كاملة" })).toBeInTheDocument();
    expect(screen.queryByText("Download authoring resources")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Recommended one-file AI bundles" })).not.toBeInTheDocument();
  });
});
