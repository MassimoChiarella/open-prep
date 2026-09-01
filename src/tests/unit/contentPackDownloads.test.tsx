import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ContentPackDownloadsPage from "@/app/content-packs/downloads/page";
import { I18nProvider } from "@/features/i18n/I18nProvider";
import { localePreferenceStorageKey } from "@/features/i18n/i18n";

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

const expectedGroups = {
  "Editable starters and examples": [
    "/question-pack-starter.mathdrill.json",
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
  ],
  "Human guide and schemas": [
    "/question-pack-author-guide.md?revision=2026-08-31",
    "/question-pack-v2.schema.json",
    "/question-pack-v3.schema.json"
  ],
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
    "/math-drill-ai-pack-authoring-kit.md?revision=2026-08-29"
  ],
  "Advanced focused components": [
    "/math-drill-ai-pack-fixed-numeric-kit.md?revision=2026-08-29",
    "/math-drill-ai-pack-generated-template-kit.md?revision=2026-08-29",
    "/math-drill-ai-pack-exhibit-kit.md?revision=2026-08-29",
    "/math-drill-ai-pack-market-sizing-kit.md?revision=2026-08-29",
    "/math-drill-ai-pack-benchmark-kit.md?revision=2026-08-29",
    "/math-drill-ai-pack-case-practice-kit.md?revision=2026-08-29"
  ]
} as const;

describe("ContentPackDownloadsPage", () => {
  it("leads with the seven-step human workflow and canonical hub actions", () => {
    render(<ContentPackDownloadsPage />);

    const humanPath = screen.getByTestId("human-authoring-path");
    const steps = within(humanPath).getAllByRole("listitem").map((item) => item.querySelector("strong")?.textContent);
    expect(steps).toEqual(["Choose", "Edit", "Validate", "Review", "Test", "License", "Submit"]);

    for (const [name, href] of [
      ["Create", "/content-packs/?view=create"],
      ["Import", "/content-packs/?view=import"],
      ["Installed", "/content-packs/?view=installed"],
      ["Resources", "/content-packs/?view=resources"]
    ] as const) {
      expect(within(humanPath).getByRole("link", { name })).toHaveAttribute("href", href);
    }

    expect(humanPath).toHaveTextContent("cannot prove factual truth");
    expect(humanPath).toHaveTextContent("answer-key quality");
    expect(humanPath).toHaveTextContent("after a successful first access");

    const starters = screen.getByRole("region", { name: "Editable starters and examples" });
    const guideAndSchemas = screen.getByRole("region", { name: "Human guide and schemas" });
    const optional = screen.getByTestId("optional-external-tools");
    expect(humanPath.compareDocumentPosition(starters) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(starters.compareDocumentPosition(guideAndSchemas) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(guideAndSchemas.compareDocumentPosition(optional) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it("keeps every authoring asset on a unique same-origin download link", () => {
    render(<ContentPackDownloadsPage />);
    fireEvent.click(screen.getByText("Optional external-tool materials"));

    expect(screen.getByRole("link", { name: "Back to Content Packs" })).toHaveAttribute(
      "href",
      "/content-packs/?view=resources"
    );

    for (const [groupName, expectedHrefs] of Object.entries(expectedGroups)) {
      const group = screen.getByRole("region", { name: groupName });
      const links = within(group).getAllByRole("link", { name: /^Download / });
      expect(links.map((link) => link.getAttribute("href"))).toEqual(expectedHrefs);
    }

    const links = screen.getAllByRole("link", { name: /^Download / });
    const hrefs = links.map((link) => link.getAttribute("href") ?? "");
    expect(new Set(hrefs).size).toBe(hrefs.length);

    for (const link of links) {
      const href = link.getAttribute("href") ?? "";
      expect(href).toMatch(/^\//);
      expect(new URL(href, "https://open-prep.invalid").origin).toBe("https://open-prep.invalid");
      expect(link).toHaveAttribute("download");
      expect(existsSync(resolve(process.cwd(), "public", href.slice(1).split("?")[0]))).toBe(true);
    }

    const publicAuthoringAssets = readdirSync(resolve(process.cwd(), "public"))
      .filter((fileName) =>
        fileName.endsWith(".mathdrill.json") ||
        fileName === "question-pack-author-guide.md" ||
        fileName === "question-pack-v2.schema.json" ||
        fileName === "question-pack-v3.schema.json" ||
        /^math-drill-ai-pack-.*\.md$/.test(fileName)
      )
      .sort();
    const listedAuthoringAssets = hrefs.map((href) => href.slice(1).split("?")[0]).sort();
    expect(listedAuthoringAssets).toEqual(publicAuthoringAssets);
  });

  it("keeps external-tool material collapsed, secondary, and explicit about trust", () => {
    render(<ContentPackDownloadsPage />);

    const optional = screen.getByTestId("optional-external-tools");
    expect(optional).not.toHaveAttribute("open");
    expect(optional.querySelector("summary")).toHaveTextContent("Optional external-tool materials");
    expect(optional).toHaveTextContent("External tools are outside Open Prep.");
    expect(optional).toHaveTextContent("Material submitted to them leaves the local app.");
    expect(optional).toHaveTextContent("do not submit confidential or personal data");
    expect(optional).toHaveTextContent("The Open Prep importer is authoritative.");

    fireEvent.click(within(optional).getByText("Optional external-tool materials"));
    expect(optional).toHaveAttribute("open");
    expect(within(optional).getByRole("region", { name: "Recommended one-file AI bundles" }))
      .toHaveTextContent("no second attachment is needed");
    expect(within(optional).getByRole("region", { name: "Advanced focused components" }))
      .toHaveTextContent("not self-contained attachments");
  });

  it("uses the localization hook in Arabic without requiring catalog edits", async () => {
    window.localStorage.setItem(localePreferenceStorageKey, "ar");
    render(<I18nProvider><ContentPackDownloadsPage /></I18nProvider>);

    await waitFor(() => expect(screen.getByRole("heading", { name: "تنزيل موارد التأليف" })).toBeInTheDocument());
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("link", { name: "العودة إلى حزم المحتوى" })).toHaveAttribute(
      "href",
      "/content-packs/?view=resources"
    );

    fireEvent.click(screen.getByText("مواد اختيارية للأدوات الخارجية"));
    expect(screen.getByRole("region", { name: "حزم ذكاء اصطناعي موصى بها بملف واحد" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "تنزيل حزمة رقمية ثابتة كاملة" })).toBeInTheDocument();
    expect(screen.queryByText("Download authoring resources")).not.toBeInTheDocument();
  });

  it("renders without making external requests", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    render(<ContentPackDownloadsPage />);
    fireEvent.click(screen.getByText("Optional external-tool materials"));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: /https?:\/\//i })).not.toBeInTheDocument();
  });
});
