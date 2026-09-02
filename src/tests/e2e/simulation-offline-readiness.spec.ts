import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page, type Request } from "@playwright/test";

import type { FullCaseSimulationSpec } from "../../features/case-practice/simulation/fullCaseTypes";
import { appDatabaseName, appDatabaseVersion } from "../../lib/storage/appStorageTypes";

test("a warmed simulation renders its first chart, saves, and reopens offline", async ({ page }) => {
  test.slow();
  const pack = JSON.parse(readFileSync(
    path.resolve("public/question-pack-v3-full-case-example.mathdrill.json"), "utf8"
  )) as { id: string; packVersion: string; fullCases: FullCaseSimulationSpec[] };
  const simulation = pack.fullCases[0];
  if (simulation === undefined) throw new Error("The full-case example is missing its simulation.");
  // Exercise the chart dependency with the existing example's unchanged data and answer key.
  simulation.exhibit.visualization = {
    type: "bar_chart",
    xColumnId: "district",
    yColumnIds: ["bookings"]
  };
  const simulationPath = `/case-practice/simulation/?pack=${encodeURIComponent(pack.id)}`;
  const exhibitId = `question-pack:${pack.id}:version:${encodeURIComponent(pack.packVersion)}:full-case-exhibit:${simulation.exhibit.id}`;

  await page.goto("/content-packs/?view=import");
  await expect.poll(
    () => page.evaluate(async () => (await navigator.serviceWorker.getRegistration("/"))?.active?.state),
    { timeout: 20_000 }
  ).toBe("activated");
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await page.getByLabel("Choose a question pack").setInputFiles({
    buffer: Buffer.from(JSON.stringify(pack)),
    mimeType: "application/json",
    name: "offline-chart-full-case.mathdrill.json"
  });
  await expect(page.getByTestId("question-pack-preview")).toBeVisible();
  await page.getByRole("checkbox", { name: /I reviewed the answer keys/ }).check();
  await page.getByRole("button", { name: "Install Pack" }).click();
  await expect(page.getByText("Question pack installed on this device.", { exact: true })).toBeVisible();

  await page.goto(simulationPath);
  await expect(page.getByPlaceholder("Type a question you would ask the interviewer").first()).toBeVisible();
  await expect(page.getByTestId(`exhibit-chart-${exhibitId}`)).toHaveCount(0);

  const stageChunkRequests: string[] = [];
  const recordStageChunk = (request: Request) => {
    if (request.resourceType() === "script" && new URL(request.url()).pathname.startsWith("/_next/static/")) {
      stageChunkRequests.push(request.url());
    }
  };
  page.on("request", recordStageChunk);
  await page.context().setOffline(true);
  try {
    await reachCalculation(page, simulation);
    await expectRenderedChart(page, exhibitId, simulation.exhibit.rows.length);
    await page.locator("#full-case-calculation").fill("11900");
    await page.getByRole("button", { name: "Continue to Brainstorm" }).click();

    const ideas = simulation.brainstorming.themes.flatMap((theme) => theme.ideas.filter((idea) => idea.relevant));
    for (const idea of ideas) await page.getByLabel(`Include ${idea.label}`, { exact: true }).check();
    for (const id of simulation.brainstorming.priorityIdeaIds) {
      const idea = ideas.find((candidate) => candidate.id === id);
      if (idea === undefined) throw new Error(`Missing priority idea ${id}.`);
      await page.getByLabel(`Prioritize ${idea.label}`, { exact: true }).check();
    }
    await page.getByRole("button", { name: "Continue to Synthesize" }).click();
    for (const [dimension, id] of Object.entries(simulation.synthesis.correctResponse)) {
      const option = simulation.synthesis.options[dimension as keyof typeof simulation.synthesis.options]
        .find((candidate) => candidate.id === id);
      if (option === undefined) throw new Error(`Missing synthesis option ${id}.`);
      await page.getByRole("radio", { name: option.label }).check();
    }
    await page.getByRole("button", { name: "Complete Case" }).click();
    await expect(page.getByTestId("full-case-total-score")).toBeVisible();
    await expect(page.getByText("This full-case result is available to your local preparation roadmap.")).toBeVisible();
    expect(stageChunkRequests, "All stage dependencies should load when the simulation route opens online.").toEqual([]);
    page.off("request", recordStageChunk);

    const saved = await readPracticeRecords(page);
    expect(saved).toEqual([expect.objectContaining({
      itemId: expect.stringContaining(`:full-case:${simulation.id}`),
      maxScore: 100,
      module: "full_case",
      score: expect.any(Number)
    })]);

    // A fresh document must load its modules from the offline cache, not the previous page's memory.
    const context = page.context();
    await page.close();
    const reopened = await context.newPage();
    await reopened.goto(simulationPath);
    await reachCalculation(reopened, simulation);
    await expectRenderedChart(reopened, exhibitId, simulation.exhibit.rows.length);
    expect(await readPracticeRecords(reopened)).toEqual(saved);
  } finally {
    page.off("request", recordStageChunk);
    await page.context().setOffline(false);
  }
});

async function reachCalculation(page: Page, simulation: FullCaseSimulationSpec): Promise<void> {
  const questioning = simulation.questioning;
  if (questioning === undefined) throw new Error("The full-case example is missing its questioning stage.");
  const inputs = page.getByPlaceholder("Type a question you would ask the interviewer");
  for (let index = 0; index < questioning.minimumQuestions; index += 1) {
    const question = questioning.intents[index]?.referenceQuestions[0];
    if (question === undefined) throw new Error(`Missing reference question ${index}.`);
    await inputs.nth(index).fill(question);
  }
  await page.getByRole("button", { name: "Continue to Structure" }).click();
  const structure = simulation.structure;
  const hypothesis = structure.hypotheses.find((candidate) => candidate.id === structure.acceptedHypothesisId);
  if (hypothesis === undefined) throw new Error("Missing accepted full-case hypothesis.");
  await page.getByLabel(hypothesis.label).check();
  for (const { branchId } of structure.modelStructure) {
    const branch = structure.branchOptions.find((candidate) => candidate.id === branchId);
    if (branch === undefined) throw new Error(`Missing structure branch ${branchId}.`);
    await page.getByLabel(branch.label, { exact: false }).check();
  }
  await page.getByRole("button", { name: "Continue to Exhibit and math" }).click();
}

async function expectRenderedChart(page: Page, exhibitId: string, rowCount: number): Promise<void> {
  const chart = page.getByTestId(`exhibit-chart-canvas-${exhibitId}`);
  await expect(chart).toBeVisible();
  await expect(chart.locator("svg.recharts-surface")).toBeVisible();
  await expect(chart.locator(".recharts-bar-rectangle")).toHaveCount(rowCount);
}

async function readPracticeRecords(page: Page): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(({ databaseName, version }) => new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
    const request = indexedDB.open(databaseName, version);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("practice_records", "readonly");
      const records = transaction.objectStore("practice_records").getAll();
      records.onsuccess = () => resolve(records.result);
      records.onerror = () => reject(records.error);
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => {
        database.close();
        reject(transaction.error);
      };
    };
  }), { databaseName: appDatabaseName, version: appDatabaseVersion });
}
