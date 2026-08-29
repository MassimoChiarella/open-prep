import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { benchmarkTests } from "@/data/questionBank/benchmarkTests";
import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { marketSizingTemplates } from "@/data/marketSizing/marketSizingTemplates";
import { CasePracticeQuestionPackContent } from "@/features/question-packs/CasePracticeQuestionPackContent";
import {
  QuestionPackBenchmarkSelection,
  QuestionPackExhibitContent,
  QuestionPackExhibitSprintContent,
  QuestionPackMarketSizingContent
} from "@/features/question-packs/SpecializedQuestionPackContent";
import { validateQuestionPackPayload } from "@/features/question-packs/questionPack";
import type { QuestionPackRecord } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

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
    expect(screen.getByRole("link", { name: "Manage Content Packs" })).toHaveAttribute("href", "/settings");
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
});

function readValidPack(fileName: string): QuestionPackRecord {
  const payload: unknown = JSON.parse(readFileSync(resolve(process.cwd(), "public", fileName), "utf8"));
  const validation = validateQuestionPackPayload(payload, "2026-08-10T12:00:00.000Z");
  if (validation.status === "invalid") throw new Error(validation.errors.join("\n"));
  return validation.pack;
}
