import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { benchmarkTests } from "@/data/questionBank/benchmarkTests";
import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { marketSizingTemplates } from "@/data/marketSizing/marketSizingTemplates";
import { CasePracticeQuestionPackContent } from "@/features/question-packs/CasePracticeQuestionPackContent";
import { QuestionPackDrillSessionLoader } from "@/features/question-packs/QuestionPackDrillSession";
import {
  QuestionPackBenchmarkSelection,
  QuestionPackBenchmarkSession,
  QuestionPackExhibitContent,
  QuestionPackExhibitSprintContent,
  QuestionPackMarketSizingContent
} from "@/features/question-packs/SpecializedQuestionPackContent";
import { validateQuestionPackPayload } from "@/features/question-packs/questionPack";
import {
  questionPackPoolPreferenceStorageKey,
  writeQuestionPackPoolPreference
} from "@/features/question-packs/questionPackPoolPreference";
import type { QuestionPackRecord } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

afterEach(() => window.localStorage.removeItem(questionPackPoolPreferenceStorageKey));

describe("specialized question-pack content", () => {
  it("loads an installed version-three questioning pack into case practice", async () => {
    const storage = new MemoryAppStorage();
    const pack = readValidPack("question-pack-case-questioning-example.mathdrill.json");
    await storage.put("question_packs", pack);

    render(
      <CasePracticeQuestionPackContent
        packId={pack.id}
        storageFactory={() => storage}
        view="questioning"
      />
    );

    expect(await screen.findByRole("heading", { name: "Questioning practice" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Northline Software Churn" })).toBeInTheDocument();
    expect(screen.getByText(/monthly customer churn rise from 2% to 5%/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Questioning practice" }).closest("[dir='auto']"))
      .not.toHaveAttribute("lang");
  });

  it("loads an installed exhibit pack into the existing exhibit flow", async () => {
    const storage = new MemoryAppStorage();
    const pack = readValidPack("question-pack-exhibit-example.mathdrill.json");
    await storage.put("question_packs", pack);

    render(
      <QuestionPackExhibitContent
        builtInDatasets={exhibitDatasets}
        packId={pack.id}
        storageFactory={() => storage}
      />
    );

    expect(await screen.findByRole("heading", { name: "Example Delivery Channel Exhibit" })).toBeInTheDocument();
    expect(screen.getByTestId("exhibit-question-prompt")).toHaveTextContent(
      "How many completed orders are shown in total?"
    );
    expect(screen.getByTestId("exhibit-select")).toHaveValue(
      "question-pack:example-delivery-channel-exhibit:version:1.0:exhibit:delivery-channel-orders"
    );
    expect(screen.getByRole("link", { name: "Start Exhibit Sprint" })).toHaveAttribute(
      "href",
      `/exhibits/sprint?pack=${pack.id}`
    );
    expect(screen.getByRole("link", { name: "Manage Content Packs" })).toHaveAttribute(
      "href",
      "/content-packs?view=installed"
    );
    expect(screen.getByTestId("exhibit-question-prompt").closest("[dir='auto']"))
      .not.toHaveAttribute("lang");
  });

  it("marks RTL catalog content without changing the interface language", async () => {
    const storage = new MemoryAppStorage();
    const sourcePack = readValidPack("question-pack-exhibit-example.mathdrill.json");
    if (sourcePack.kind !== "exhibit") throw new Error("Expected an exhibit pack.");
    const pack: QuestionPackRecord = {
      ...sourcePack,
      catalogProvenance: catalogProvenance(sourcePack, "ar"),
      datasets: sourcePack.datasets.map((dataset) => ({
        ...dataset,
        questions: dataset.questions.map((question) => ({
          ...question,
          prompt: "ما إجمالي عدد الطلبات المكتملة؟"
        })),
        title: "طلبات قنوات التوصيل"
      })),
      title: "تمارين معارض عربية"
    };
    await storage.put("question_packs", pack);

    render(
      <QuestionPackExhibitContent
        builtInDatasets={exhibitDatasets}
        packId={pack.id}
        storageFactory={() => storage}
      />
    );

    const prompt = await screen.findByTestId("exhibit-question-prompt");
    expect(prompt).toHaveTextContent("ما إجمالي عدد الطلبات المكتملة؟");
    expect(prompt.closest("[dir='auto']")).toHaveAttribute("lang", "ar");
    expect(screen.getByRole("link", { name: "Manage Content Packs" })).toBeInTheDocument();
    expect(document.documentElement).not.toHaveAttribute("dir", "rtl");
  });

  it("applies trusted catalog language to an installed numeric drill", async () => {
    const storage = new MemoryAppStorage();
    const sourcePack = readValidPack("question-pack-example.mathdrill.json");
    if (sourcePack.kind !== "fixed_numeric") throw new Error("Expected a fixed numeric pack.");
    const pack: QuestionPackRecord = {
      ...sourcePack,
      catalogProvenance: catalogProvenance(sourcePack, "ar"),
      questions: sourcePack.questions.map((question) => ({
        ...question,
        prompt: "احسب الإيرادات السنوية."
      })),
      title: "تدريب حسابي"
    };
    await storage.put("question_packs", pack);

    render(
      <QuestionPackDrillSessionLoader
        difficulty="beginner"
        packId={pack.id}
        questionCount={1}
        storageFactory={() => storage}
      />
    );

    const prompt = await screen.findByTestId("active-question-prompt");
    expect(prompt).toHaveTextContent("احسب الإيرادات السنوية.");
    expect(prompt).toHaveAttribute("dir", "auto");
    expect(prompt.closest("[lang='ar']")).toHaveAttribute("lang", "ar");
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("loads an installed exhibit pack into sprint and preserves its pack source in the back link", async () => {
    const storage = new MemoryAppStorage();
    const pack = readValidPack("question-pack-visualization-cookbook.mathdrill.json");
    await storage.put("question_packs", pack);

    render(
      <QuestionPackExhibitSprintContent
        builtInDatasets={exhibitDatasets}
        packId={pack.id}
        storageFactory={() => storage}
      />
    );

    expect(await screen.findByTestId("exhibit-sprint-setup")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Practice Individual Exhibits" })).toHaveAttribute(
      "href",
      `/exhibits?pack=${pack.id}`
    );
    fireEvent.change(screen.getByLabelText("Timing choice"), { target: { value: "untimed" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Exhibit Sprint" }));
    expect(screen.getByRole("timer")).toHaveTextContent("No automatic expiry");
    expect(screen.getByTestId("exhibit-sprint-active-timing")).toHaveTextContent("Untimed practice");
  });

  it("exposes the same timing choices for the built-in Exhibit Sprint", async () => {
    render(
      <QuestionPackExhibitSprintContent
        builtInDatasets={exhibitDatasets}
        storageFactory={() => new MemoryAppStorage()}
      />
    );

    expect(await screen.findByLabelText("Timing choice")).toHaveValue("standard");
    expect(screen.getByRole("option", { name: "Time and a half" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Double time" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Untimed practice" })).toBeInTheDocument();
  });

  it("shows an explicit error when a sprint pack is not installed", async () => {
    const storage = new MemoryAppStorage();

    render(
      <QuestionPackExhibitSprintContent
        builtInDatasets={exhibitDatasets}
        packId="missing-exhibit-pack"
        storageFactory={() => storage}
      />
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("This content pack is not installed on this device.");
  });

  it("shows an explicit error when sprint receives a non-exhibit pack", async () => {
    const storage = new MemoryAppStorage();
    const pack = readValidPack("question-pack-market-sizing-example.mathdrill.json");
    await storage.put("question_packs", pack);

    render(
      <QuestionPackExhibitSprintContent
        builtInDatasets={exhibitDatasets}
        packId={pack.id}
        storageFactory={() => storage}
      />
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("does not contain exhibit content");
  });

  it("loads an installed market-sizing pack into the guided form", async () => {
    const storage = new MemoryAppStorage();
    const pack = readValidPack("question-pack-market-sizing-example.mathdrill.json");
    await storage.put("question_packs", pack);

    render(
      <QuestionPackMarketSizingContent
        builtInTemplates={marketSizingTemplates}
        packId={pack.id}
        storageFactory={() => storage}
      />
    );

    expect(await screen.findByRole("heading", { name: "Guided Market Sizing" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Neighborhood Delivery Spend" })).toBeInTheDocument();
    expect(screen.getByText(/Estimate annual spending on local grocery delivery/)).toBeInTheDocument();
  });

  it("loads an installed benchmark pack and preserves its pack source in links", async () => {
    const storage = new MemoryAppStorage();
    const pack = readValidPack("question-pack-benchmark-example.mathdrill.json");
    await storage.put("question_packs", pack);

    render(
      <QuestionPackBenchmarkSelection
        builtInBenchmarks={benchmarkTests}
        packId={pack.id}
        storageFactory={() => storage}
      />
    );

    const card = await screen.findByTestId(
      "benchmark-card-question-pack:example-foundations-benchmark:version:1.0:benchmark:foundations-check"
    );
    expect(within(card).getByRole("heading", { name: "Foundations Check" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Begin Benchmark" })).toHaveAttribute(
      "href",
      expect.stringContaining("pack=example-foundations-benchmark")
    );
  });

  it("applies an accommodation to an imported benchmark without changing its Standard duration", async () => {
    const storage = new MemoryAppStorage();
    const pack = readValidPack("question-pack-benchmark-example.mathdrill.json");
    await storage.put("question_packs", pack);

    render(
      <QuestionPackBenchmarkSession
        benchmarkId="question-pack:example-foundations-benchmark:version:1.0:benchmark:foundations-check"
        builtInBenchmarks={benchmarkTests}
        packId={pack.id}
        storageFactory={() => storage}
        timingAccommodation="double_time"
      />
    );

    expect(await screen.findByRole("heading", { name: "Foundations Check" })).toBeInTheDocument();
    const lockPanel = screen.getByTestId("active-session-lock-panel");
    expect(within(lockPanel).getByText("Standard limit")).toBeInTheDocument();
    expect(within(lockPanel).getByText("4 min")).toBeInTheDocument();
    expect(within(lockPanel).getByText("Double time: 8 min")).toBeInTheDocument();
    expect(screen.getByText(/excluded from Standard comparisons and personal bests/)).toBeInTheDocument();
  });

  it("shows a clear error instead of falling back when a selected pack has the wrong kind", async () => {
    const storage = new MemoryAppStorage();
    const pack = readValidPack("question-pack-exhibit-example.mathdrill.json");
    await storage.put("question_packs", pack);

    render(
      <QuestionPackMarketSizingContent
        builtInTemplates={marketSizingTemplates}
        packId={pack.id}
        storageFactory={() => storage}
      />
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("does not contain market-sizing content");
    expect(screen.queryByRole("heading", { name: "Guided Market Sizing" })).not.toBeInTheDocument();
  });

  it("adds only selected compatible exhibit packs to the built-in pool", async () => {
    const storage = new MemoryAppStorage();
    const exhibitPack = readValidPack("question-pack-exhibit-example.mathdrill.json");
    const marketPack = readValidPack("question-pack-market-sizing-example.mathdrill.json");
    await storage.put("question_packs", exhibitPack);
    await storage.put("question_packs", marketPack);
    writeQuestionPackPoolPreference({
      mode: "built_in_and_selected",
      selectedPackIds: [exhibitPack.id, marketPack.id]
    });
    const get = vi.spyOn(storage, "get");

    render(
      <QuestionPackExhibitContent
        builtInDatasets={exhibitDatasets}
        storageFactory={() => storage}
      />
    );

    const select = await screen.findByTestId("exhibit-select");
    expect(within(select).getByRole("option", { name: "Retail Format Economics" })).toBeInTheDocument();
    expect(within(select).getByRole("option", { name: "Orders by Delivery Channel" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start Exhibit Sprint" })).toHaveAttribute("href", "/exhibits/sprint");
    expect(get.mock.calls.map(([, id]) => id)).toEqual([exhibitPack.id, marketPack.id]);
  });

  it("uses multiple selected market-sizing packs without built-ins", async () => {
    const storage = new MemoryAppStorage();
    const first = readValidPack("question-pack-market-sizing-example.mathdrill.json");
    const second = readValidPack("question-pack-market-sizing-cookbook.mathdrill.json");
    await storage.put("question_packs", first);
    await storage.put("question_packs", second);
    writeQuestionPackPoolPreference({
      mode: "selected_only",
      selectedPackIds: [first.id, second.id]
    });

    render(
      <QuestionPackMarketSizingContent
        builtInTemplates={marketSizingTemplates}
        storageFactory={() => storage}
      />
    );

    expect(await screen.findByRole("option", { name: "Neighborhood Delivery Spend" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Reusable Container Pickup Demand" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "City Coffee Spend" })).not.toBeInTheDocument();
  });

  it("shows a settings recovery link when selected-only has no compatible installed pack", async () => {
    const storage = new MemoryAppStorage();
    const exhibitPack = readValidPack("question-pack-exhibit-example.mathdrill.json");
    await storage.put("question_packs", exhibitPack);
    writeQuestionPackPoolPreference({ mode: "selected_only", selectedPackIds: [exhibitPack.id] });

    render(
      <QuestionPackMarketSizingContent
        builtInTemplates={marketSizingTemplates}
        storageFactory={() => storage}
      />
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("No compatible selected content packs are installed");
    expect(screen.getByRole("link", { name: "Review Question Pool" })).toHaveAttribute(
      "href",
      "/settings#question-pool-settings"
    );
    expect(screen.queryByRole("heading", { name: "Guided Market Sizing" })).not.toBeInTheDocument();
  });

  it("keeps an explicit pack as an exact override of the saved pool", async () => {
    const storage = new MemoryAppStorage();
    const exactPack = readValidPack("question-pack-exhibit-example.mathdrill.json");
    const selectedPack = readValidPack("question-pack-chart-example.mathdrill.json");
    await storage.put("question_packs", exactPack);
    await storage.put("question_packs", selectedPack);
    writeQuestionPackPoolPreference({ mode: "selected_only", selectedPackIds: [selectedPack.id] });
    const get = vi.spyOn(storage, "get");

    render(
      <QuestionPackExhibitContent
        builtInDatasets={exhibitDatasets}
        packId={exactPack.id}
        storageFactory={() => storage}
      />
    );

    const select = await screen.findByTestId("exhibit-select");
    expect(within(select).getByRole("option", { name: "Orders by Delivery Channel" })).toBeInTheDocument();
    expect(within(select).queryByRole("option", { name: "Revenue by Client Sector" })).not.toBeInTheDocument();
    expect(get.mock.calls.map(([, id]) => id)).toEqual([exactPack.id]);
    expect(screen.getByRole("link", { name: "Start Exhibit Sprint" })).toHaveAttribute(
      "href",
      `/exhibits/sprint?pack=${exactPack.id}`
    );
  });

  it("omits pack query parameters from pooled benchmark links", async () => {
    const storage = new MemoryAppStorage();
    const pack = readValidPack("question-pack-benchmark-example.mathdrill.json");
    await storage.put("question_packs", pack);
    writeQuestionPackPoolPreference({ mode: "selected_only", selectedPackIds: [pack.id] });

    render(
      <QuestionPackBenchmarkSelection
        builtInBenchmarks={benchmarkTests}
        storageFactory={() => storage}
      />
    );

    const card = await screen.findByTestId(
      "benchmark-card-question-pack:example-foundations-benchmark:version:1.0:benchmark:foundations-check"
    );
    const href = within(card).getByRole("link", { name: "Foundations Check selected" }).getAttribute("href");
    expect(href).not.toContain("pack=");
  });

  it("aggregates all case-practice collections across selected packs", async () => {
    const storage = new MemoryAppStorage();
    const broadPack = readValidPack("question-pack-case-practice-example.mathdrill.json");
    const questioningPack = readValidPack("question-pack-case-questioning-example.mathdrill.json");
    await storage.put("question_packs", broadPack);
    await storage.put("question_packs", questioningPack);
    writeQuestionPackPoolPreference({
      mode: "selected_only",
      selectedPackIds: [broadPack.id, questioningPack.id]
    });

    render(
      <CasePracticeQuestionPackContent
        storageFactory={() => storage}
        view="hub"
      />
    );

    const questioning = await screen.findByRole("link", { name: "Open Questioning" });
    const structuring = screen.getByRole("link", { name: "Open Structuring" });
    const brainstorming = screen.getByRole("link", { name: "Open Brainstorming" });
    const synthesis = screen.getByRole("link", { name: "Open Synthesis" });
    const lessons = screen.getByRole("link", { name: "Open Concept Lessons" });
    const fit = screen.getByRole("link", { name: "Open Fit Practice" });
    const fullCase = screen.getByRole("link", { name: "Open Neighborhood pickup rollout" });

    for (const link of [questioning, structuring, brainstorming, synthesis, lessons, fit, fullCase]) {
      expect(link.getAttribute("href")).not.toContain("pack=");
    }
    expect(fullCase.getAttribute("href")).toContain("case=question-pack%3A");
    expect(screen.getByRole("link", { name: "Question Pool Settings" })).toHaveAttribute(
      "href",
      "/settings#question-pool-settings"
    );
  });

  it("keeps Prep Plan in an additive case-practice pool", async () => {
    const storage = new MemoryAppStorage();
    const pack = readValidPack("question-pack-case-practice-example.mathdrill.json");
    await storage.put("question_packs", pack);
    writeQuestionPackPoolPreference({ mode: "built_in_and_selected", selectedPackIds: [pack.id] });

    render(
      <CasePracticeQuestionPackContent
        storageFactory={() => storage}
        view="hub"
      />
    );

    expect(await screen.findByRole("link", { name: "Open Prep Plan" })).toHaveAttribute(
      "href",
      "/case-practice/plan"
    );
    expect(screen.getByRole("link", { name: "Open Neighborhood pickup rollout" })).toBeInTheDocument();
  });
});

function readValidPack(fileName: string): QuestionPackRecord {
  const payload: unknown = JSON.parse(readFileSync(resolve(process.cwd(), "public", fileName), "utf8"));
  const validation = validateQuestionPackPayload(payload, "2026-08-10T12:00:00.000Z");
  if (validation.status === "invalid") throw new Error(validation.errors.join("\n"));
  return validation.pack;
}

function catalogProvenance(pack: QuestionPackRecord, language: string) {
  return {
    file: `/community-packs/${pack.id}/${pack.packVersion}/pack.mathdrill.json`,
    id: pack.id,
    language,
    publisherId: "open-prep",
    reviewDate: "2026-08-31",
    sha256: "a".repeat(64),
    source: "repository_catalog" as const,
    version: pack.packVersion
  };
}
