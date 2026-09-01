import { createHash } from "node:crypto";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ContentPacksHub,
  ContentPacksState,
  contentPacksViewIds,
  parseContentPacksView,
  type ContentPacksStateKind
} from "@/features/question-packs/ContentPacksHub";

const navigation = vi.hoisted(() => ({ view: null as string | null }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (name: string) => name === "view" ? navigation.view : null })
}));

vi.mock("@/features/i18n/I18nProvider", () => ({
  useI18n: () => ({
    formatDate: (value: Date | number | string) => String(value),
    formatNumber: (value: number) => String(value),
    locale: "en",
    t: (message: string, values?: Record<string, string>) => Object.entries(values ?? {}).reduce(
      (result, [key, value]) => result.replaceAll(`{${key}}`, value),
      message
    )
  })
}));

vi.mock("@/features/question-packs/QuestionPackManager", () => ({
  QuestionPackManager: ({ catalogCandidate, view }: { catalogCandidate?: { key: string }; view: string }) => (
    <div data-candidate-key={catalogCandidate?.key} data-manager-view={view} data-testid="question-pack-manager" />
  )
}));

vi.mock("@/features/question-packs/ContentPackStarterLibrary", () => ({
  ContentPackStarterLibrary: () => <div data-testid="content-pack-starter-library" />
}));

describe("ContentPacksHub", () => {
  beforeEach(() => {
    navigation.view = null;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      catalogSchemaVersion: 1,
      entries: [],
      tombstones: []
    }))));
  });

  it("parses only frozen view values and falls back predictably to discover", () => {
    for (const view of contentPacksViewIds) {
      expect(parseContentPacksView(view)).toBe(view);
    }

    expect(parseContentPacksView(null)).toBe("discover");
    expect(parseContentPacksView(undefined)).toBe("discover");
    expect(parseContentPacksView("Installed")).toBe("discover");
    expect(parseContentPacksView("unknown")).toBe("discover");
  });

  it("exposes native destinations in visual and keyboard order with the current view marked", () => {
    render(<ContentPacksHub />);

    const navigationRegion = screen.getByRole("navigation", { name: "Content Pack views" });
    const links = within(navigationRegion).getAllByRole("link");

    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual(
      contentPacksViewIds.map((view) => [
        view[0].toUpperCase() + view.slice(1),
        `/content-packs/?view=${view}`
      ])
    );
    expect(links[0]).toHaveAttribute("aria-current", "page");
    expect(links.slice(1).every((link) => !link.hasAttribute("aria-current"))).toBe(true);

    for (const link of links) {
      link.focus();
      expect(link).toHaveFocus();
    }
  });

  it("derives direct and history-restored views from the URL query", () => {
    navigation.view = "installed";
    const { rerender } = render(<ContentPacksHub />);

    expect(screen.getByRole("heading", { level: 2, name: "Installed" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Installed" })).toHaveAttribute("aria-current", "page");

    navigation.view = "import";
    rerender(<ContentPacksHub />);
    expect(screen.getByRole("heading", { level: 2, name: "Import" })).toBeInTheDocument();

    navigation.view = "installed";
    rerender(<ContentPacksHub />);
    expect(screen.getByRole("heading", { level: 2, name: "Installed" })).toBeInTheDocument();
  });

  it("shows discover for an invalid direct URL without rewriting or inventing a view", async () => {
    navigation.view = "not-a-view";
    render(<ContentPacksHub />);

    expect(screen.getByRole("heading", { level: 2, name: "Discover" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Discover" })).toHaveAttribute("aria-current", "page");
    expect(await screen.findByRole("heading", { name: "No reviewed community packs yet" })).toBeInTheDocument();
  });

  it("routes a selected catalog entry through verified bytes into the canonical manager", async () => {
    const source = JSON.stringify({ id: "reviewed-pack", packVersion: "1.0.0" });
    const sha256 = createHash("sha256").update(source).digest("hex");
    const catalogFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      catalogSchemaVersion: 1,
      entries: [{
        id: "reviewed-pack",
        version: "1.0.0",
        title: "Reviewed Pack",
        summary: "Repository-reviewed practice.",
        kind: "fixed_numeric",
        topics: ["arithmetic"],
        difficulties: ["beginner"],
        language: "en",
        publisher: { id: "open-prep", name: "Open Prep" },
        contentLicenseId: "CC0-1.0",
        reviewDate: "2026-08-31",
        minimumAppVersion: "0.1.0",
        packSchemaVersion: 2,
        file: "/community-packs/reviewed-pack/1.0.0/pack.mathdrill.json",
        bytes: new TextEncoder().encode(source).byteLength,
        sha256,
        repositoryReviewed: true,
        deprecated: false
      }],
      tombstones: []
    })));
    const packFetch = vi.fn().mockResolvedValue(new Response(source));

    render(<ContentPacksHub catalogFetch={catalogFetch} packFetch={packFetch} />);
    fireEvent.click(await screen.findByRole("button", { name: "Review pack" }));

    await waitFor(() => expect(screen.getByTestId("question-pack-manager")).toHaveAttribute(
      "data-candidate-key",
      `reviewed-pack:1.0.0:${sha256}`
    ));
    expect(packFetch).toHaveBeenCalledWith(
      "/community-packs/reviewed-pack/1.0.0/pack.mathdrill.json",
      { credentials: "same-origin", headers: { Accept: "application/json" } }
    );
    expect(screen.getByRole("heading", { name: "Review and install Reviewed Pack" })).toHaveFocus();
  });

  it("composes each working view through the canonical manager", () => {
    for (const view of ["installed", "import", "create"] as const) {
      navigation.view = view;
      const { unmount } = render(<ContentPacksHub />);
      expect(screen.getByTestId("question-pack-manager")).toHaveAttribute("data-manager-view", view);
      if (view === "create") expect(screen.getByTestId("content-pack-starter-library")).toBeInTheDocument();
      unmount();
    }
  });

  it("provides labeled empty, loading, error, offline, and unavailable presentations", () => {
    const cases: ReadonlyArray<[ContentPacksStateKind, string]> = [
      ["empty", "Empty"],
      ["loading", "Loading"],
      ["error", "Error"],
      ["offline", "Offline"],
      ["unavailable", "Unavailable"]
    ];
    const { rerender } = render(<ContentPacksState kind="empty" />);

    for (const [kind, label] of cases) {
      rerender(<ContentPacksState kind={kind} />);
      const state = screen.getByTestId("content-packs-state");
      expect(state).toHaveAttribute("data-state", kind);
      expect(within(state).getByText(label)).toBeInTheDocument();
    }

    rerender(<ContentPacksState kind="loading" />);
    expect(screen.getByRole("status", { name: "Loading content packs" })).toHaveAttribute(
      "aria-live",
      "polite"
    );
    rerender(<ContentPacksState kind="error" />);
    expect(screen.getByRole("alert", { name: "Content packs could not be loaded" })).toBeInTheDocument();
  });

  it("links every required authoring and governance resource", () => {
    navigation.view = "resources";
    render(<ContentPacksHub />);

    const expectedLinks = [
      ["Authoring downloads", "/content-packs/downloads/"],
      ["Human author guide", "/question-pack-author-guide.md"],
      ["Question Pack Format v2", "/QUESTION_PACK_FORMAT_V2.md"],
      ["Question Pack Format v3", "/QUESTION_PACK_FORMAT_V3.md"],
      ["Content policy", "/CONTENT_POLICY.md"],
      ["Community pack lifecycle", "/COMMUNITY_PACK_LIFECYCLE.md"]
    ] as const;

    for (const [name, path] of expectedLinks) {
      expect(screen.getByRole("link", { name: new RegExp(name, "i") })).toHaveAttribute(
        "href",
        expect.stringContaining(path)
      );
    }
  });

  it("uses logical alignment and bounded grid tracks for narrow, RTL, and themed layouts", () => {
    navigation.view = "resources";
    render(
      <div data-theme="dark" dir="rtl">
        <ContentPacksHub />
      </div>
    );

    const hub = screen.getByTestId("content-packs-hub");
    const viewList = screen.getByTestId("content-packs-view-list");
    const view = screen.getByTestId("content-packs-view");
    const resource = screen.getByRole("link", { name: /Human author guide/i });

    expect(hub).toHaveClass("min-w-0");
    expect(viewList).toHaveClass("grid-cols-2", "sm:grid-cols-5", "min-w-0", "max-w-full");
    expect(view).toHaveClass("grid-cols-[minmax(0,1fr)]", "min-w-0", "max-w-full");
    expect(resource).toHaveClass("text-start", "min-w-0");
    expect(resource.closest("[dir='rtl']")).not.toBeNull();
    expect(resource.closest("[data-theme='dark']")).not.toBeNull();
  });
});
