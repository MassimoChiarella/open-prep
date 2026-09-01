import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CommunityPackDiscover } from "@/features/question-packs/CommunityPackDiscover";
import type {
  CommunityPackCatalog,
  CommunityPackCatalogEntry
} from "@/features/question-packs/communityPackCatalog";
import {
  communityPackCatalogUrl,
  type CommunityPackCatalogFetch
} from "@/features/question-packs/communityPackCatalogClient";

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
});

describe("CommunityPackDiscover", () => {
  it("loads only the fixed same-origin manifest and exposes selection without fetching a pack", async () => {
    const onSelect = vi.fn();
    const fetchMock = catalogFetch(catalog(alphaEntry));

    render(<CommunityPackDiscover fetchImpl={fetchMock} now={today} onSelect={onSelect} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading reviewed community packs");
    const alphaCard = (await screen.findByRole("heading", { name: "Alpha Arithmetic" })).closest("article");
    expect(alphaCard).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(communityPackCatalogUrl, { credentials: "same-origin" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/community-packs/catalog.v1.json");
    expect(screen.getByText("Repository reviewed")).toBeInTheDocument();
    expect(within(alphaCard!).getByText("Alpha Learning")).toBeInTheDocument();
    expect(within(alphaCard!).getByText("CC0-1.0")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Review pack" }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "alpha-arithmetic", repositoryReviewed: true }));
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("filters every catalog dimension locally and resets count and empty state", async () => {
    const fetchMock = catalogFetch(catalog(gammaEntry, betaEntry, alphaEntry));
    render(<CommunityPackDiscover fetchImpl={fetchMock} now={today} onSelect={vi.fn()} />);
    await screen.findByText("Showing 3 of 3 repository-reviewed packs");

    const cases: Array<[string, string, string]> = [
      ["Practice kind", "exhibit", "Beta Exhibits"],
      ["Topic", "market_sizing", "Gamma Sizing"],
      ["Difficulty", "expert", "Gamma Sizing"],
      ["Content language", "fr", "Beta Exhibits"],
      ["Publisher", "gamma-learning", "Gamma Sizing"],
      ["Content license", "CC-BY-SA-4.0", "Gamma Sizing"],
      ["Compatibility", "incompatible", "Gamma Sizing"],
      ["Review recency", "90", "Alpha Arithmetic"]
    ];

    for (const [label, value, expectedTitle] of cases) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
      expect(screen.getByRole("status")).toHaveTextContent("Showing 1 of 3 repository-reviewed packs");
      expect(screen.getByRole("heading", { name: expectedTitle })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
      expect(screen.getByRole("status")).toHaveTextContent("Showing 3 of 3 repository-reviewed packs");
    }

    fireEvent.change(screen.getByLabelText("Practice kind"), { target: { value: "exhibit" } });
    fireEvent.change(screen.getByLabelText("Content language"), { target: { value: "en" } });
    expect(screen.getByRole("status")).toHaveTextContent("Showing 0 of 3 repository-reviewed packs");
    expect(screen.getByRole("heading", { name: "No reviewed packs match these filters" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByRole("status")).toHaveTextContent("Showing 3 of 3 repository-reviewed packs");
    expect(screen.getByRole("button", { name: "Reset filters" })).toBeDisabled();
  });

  it("sorts results deterministically by title regardless of manifest order", async () => {
    const sameTitleNew = entry({ id: "same-title", title: "Beta Same", version: "2.0.0" });
    const sameTitleOld = entry({ id: "same-title", title: "Beta Same", version: "1.0.0" });
    render(
      <CommunityPackDiscover
        fetchImpl={catalogFetch(catalog(gammaEntry, sameTitleOld, alphaEntry, sameTitleNew, betaEntry))}
        now={today}
        onSelect={vi.fn()}
      />
    );

    const results = await screen.findByTestId("community-pack-results");
    expect(within(results).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "Alpha Arithmetic",
      "Beta Exhibits",
      "Beta Same",
      "Beta Same",
      "Gamma Sizing"
    ]);
    expect(within(results).getAllByText("Beta Same")[0]?.closest("article")).toHaveTextContent("2.0.0");
  });

  it("presents deprecated and incompatible entries without enabling incompatible selection", async () => {
    render(
      <CommunityPackDiscover
        appVersion="0.1.0"
        fetchImpl={catalogFetch(catalog(betaEntry, gammaEntry))}
        now={today}
        onSelect={vi.fn()}
      />
    );

    const betaCard = (await screen.findByRole("heading", { name: "Beta Exhibits" })).closest("article");
    const gammaCard = screen.getByRole("heading", { name: "Gamma Sizing" }).closest("article");
    expect(betaCard).not.toBeNull();
    expect(gammaCard).not.toBeNull();
    expect(within(betaCard!).getByText("Deprecated")).toBeInTheDocument();
    expect(betaCard).toHaveTextContent("Superseded by a corrected exhibit pack.");
    expect(within(gammaCard!).getByText("Incompatible")).toBeInTheDocument();
    expect(within(gammaCard!).getByRole("button", { name: "Requires a newer version" })).toBeDisabled();
    expect(gammaCard).toHaveTextContent("Requires Open Prep 9.0.0 or newer");
  });

  it("shows a validation error for an untrusted manifest", async () => {
    const fetchMock = vi.fn<CommunityPackCatalogFetch>().mockResolvedValue(jsonResponse({
      catalogSchemaVersion: 1,
      entries: [{ ...alphaEntry, repositoryReviewed: false }],
      tombstones: []
    }));
    render(<CommunityPackDiscover fetchImpl={fetchMock} onSelect={vi.fn()} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Community pack catalog could not be loaded");
    expect(alert).toHaveTextContent("did not pass validation");
  });

  it("distinguishes offline and unavailable catalog failures", async () => {
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    const offlineView = render(
      <CommunityPackDiscover
        fetchImpl={vi.fn<CommunityPackCatalogFetch>().mockRejectedValue(new TypeError("offline"))}
        onSelect={vi.fn()}
      />
    );
    expect(await screen.findByText("The community pack catalog is not available offline")).toBeInTheDocument();
    offlineView.unmount();

    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    render(
      <CommunityPackDiscover
        fetchImpl={vi.fn<CommunityPackCatalogFetch>().mockResolvedValue(new Response(null, { status: 404 }))}
        onSelect={vi.fn()}
      />
    );
    expect(await screen.findByText("Community pack catalog unavailable")).toBeInTheDocument();
  });

  it("shows the published empty state when the validated catalog has no entries", async () => {
    render(<CommunityPackDiscover fetchImpl={catalogFetch(catalog())} onSelect={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "No reviewed community packs yet" })).toBeInTheDocument();
  });
});

const today = new Date("2026-08-31T12:00:00Z");

const alphaEntry = entry({
  id: "alpha-arithmetic",
  title: "Alpha Arithmetic",
  summary: "Beginner arithmetic for interview warm-ups.",
  kind: "fixed_numeric",
  topics: ["arithmetic"],
  difficulties: ["beginner"],
  language: "en",
  publisher: { id: "alpha-learning", name: "Alpha Learning" },
  contentLicenseId: "CC0-1.0",
  reviewDate: "2026-08-15"
});

const betaEntry = entry({
  id: "beta-exhibits",
  title: "Beta Exhibits",
  summary: "Advanced chart-reading practice in French.",
  kind: "exhibit",
  topics: ["exhibit_math"],
  difficulties: ["advanced"],
  language: "fr",
  publisher: { id: "beta-school", name: "Beta School" },
  contentLicenseId: "CC-BY-4.0",
  reviewDate: "2025-01-15",
  deprecated: true,
  deprecation: {
    date: "2026-01-10",
    reason: "Superseded by a corrected exhibit pack.",
    reference: "review:beta-deprecation"
  }
});

const gammaEntry = entry({
  id: "gamma-sizing",
  title: "Gamma Sizing",
  summary: "Expert market-sizing practice for a future app version.",
  kind: "market_sizing",
  topics: ["market_sizing"],
  difficulties: ["expert"],
  language: "en-CA",
  publisher: { id: "gamma-learning", name: "Gamma Learning" },
  contentLicenseId: "CC-BY-SA-4.0",
  reviewDate: "2024-01-15",
  minimumAppVersion: "9.0.0"
});

function entry(overrides: Partial<CommunityPackCatalogEntry> = {}): CommunityPackCatalogEntry {
  const value: CommunityPackCatalogEntry = {
    id: "starter-pack",
    version: "1.0.0",
    title: "Starter Pack",
    summary: "A reviewed community practice pack.",
    kind: "fixed_numeric",
    topics: ["arithmetic"],
    difficulties: ["beginner"],
    language: "en",
    publisher: { id: "starter-publisher", name: "Starter Publisher" },
    contentLicenseId: "CC0-1.0",
    reviewDate: "2026-08-01",
    minimumAppVersion: "0.1.0",
    packSchemaVersion: 2,
    file: "/community-packs/starter-pack/1.0.0/pack.mathdrill.json",
    bytes: 1_024,
    sha256: "a".repeat(64),
    repositoryReviewed: true,
    deprecated: false,
    ...overrides
  };
  if (overrides.file === undefined) {
    value.file = `/community-packs/${value.id}/${value.version}/pack.mathdrill.json`;
  }
  return value;
}

function catalog(...entries: CommunityPackCatalogEntry[]): CommunityPackCatalog {
  return { catalogSchemaVersion: 1, entries, tombstones: [] };
}

function catalogFetch(payload: CommunityPackCatalog) {
  return vi.fn<CommunityPackCatalogFetch>().mockResolvedValue(jsonResponse(payload));
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: 200
  });
}
