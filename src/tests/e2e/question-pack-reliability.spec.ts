import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

const htmlLookingText = "<img/src=x/onerror=window.__questionPackHtmlExecuted=true>";
const maximumPrompt = `${htmlLookingText}${"Q".repeat(2_000 - htmlLookingText.length)}`;
const responsiveWidths = [390, 1_280] as const;
const maximumEnvelopeText = {
  description: unbrokenText("PACK-DESCRIPTION-", 500, "D"),
  license: unbrokenText("PACK-LICENSE-", 100, "L"),
  publisher: unbrokenText("PACK-PUBLISHER-", 100, "P"),
  title: unbrokenText("PACK-TITLE-", 100, "T")
};
const maximumDrillText = {
  feedback: unbrokenText("DRILL-FEEDBACK-", 1_000, "F"),
  hint: unbrokenText("DRILL-HINT-", 1_000, "H"),
  prompt: unbrokenText("DRILL-SUMMARY-PROMPT-", 2_000, "P"),
  shortcut: unbrokenText("DRILL-SHORTCUT-", 1_000, "S")
};
const maximumExhibitText = {
  choice: unbrokenText("EXHIBIT-CHOICE-", 500, "C"),
  datasetTitle: unbrokenText("EXHIBIT-DATASET-TITLE-", 100, "D"),
  prompt: unbrokenText("EXHIBIT-SPRINT-PROMPT-", 2_000, "P"),
  solution: unbrokenText("EXHIBIT-SOLUTION-", 1_000, "E"),
  step: unbrokenText("EXHIBIT-SOLUTION-STEP-", 1_000, "T")
};
const maximumMarketText = {
  choice: unbrokenText("MARKET-CHOICE-", 500, "C"),
  helper: unbrokenText("MARKET-HELPER-", 500, "H"),
  senseCheck: unbrokenText("MARKET-SENSE-CHECK-", 1_000, "S"),
  stepLabel: unbrokenText("MARKET-STEP-LABEL-", 200, "L")
};
const maximumBenchmarkText = {
  band: unbrokenText("BENCHMARK-BAND-", 100, "B"),
  description: unbrokenText("BENCHMARK-DESCRIPTION-", 500, "D"),
  title: unbrokenText("BENCHMARK-TITLE-", 100, "T")
};
const maximumCaseText = {
  brainstorming: unbrokenText("CASE-BRAINSTORMING-", 500, "B"),
  fitFollowUp: unbrokenText("CASE-FIT-FOLLOW-UP-", 1_000, "U"),
  fitPrompt: unbrokenText("CASE-FIT-PROMPT-", 2_000, "F"),
  fullCaseObjective: unbrokenText("CASE-FULL-OBJECTIVE-", 1_000, "O"),
  lesson: unbrokenText("CASE-LESSON-", 2_000, "L"),
  structuring: unbrokenText("CASE-STRUCTURING-", 2_000, "R"),
  synthesis: unbrokenText("CASE-SYNTHESIS-", 1_000, "S"),
  v3Brainstorming: unbrokenText("CASE-V3-BRAINSTORMING-", 1_000, "B"),
  v3BrainstormingIdea: unbrokenText("CASE-V3-BRAINSTORMING-IDEA-", 500, "I"),
  v3CalculationPrompt: unbrokenText("CASE-V3-CALCULATION-PROMPT-", 2_000, "C"),
  v3CalculationStep: unbrokenText("CASE-V3-CALCULATION-STEP-", 1_000, "E"),
  v3ExhibitTitle: unbrokenText("CASE-V3-EXHIBIT-TITLE-", 100, "X"),
  v3FullCaseSituation: unbrokenText("CASE-V3-FULL-SITUATION-", 2_000, "V"),
  v3ModelClose: unbrokenText("CASE-V3-MODEL-CLOSE-", 2_000, "M"),
  v3QuestioningObjective: unbrokenText("CASE-V3-QUESTIONING-OBJECTIVE-", 1_000, "J"),
  v3QuestioningSituation: unbrokenText("CASE-V3-QUESTIONING-SITUATION-", 2_000, "Q"),
  v3StructureObjective: unbrokenText("CASE-V3-STRUCTURE-OBJECTIVE-", 1_000, "R"),
  v3SynthesisDecision: unbrokenText("CASE-V3-SYNTHESIS-DECISION-", 1_000, "S"),
  v3SynthesisOption: unbrokenText("CASE-V3-SYNTHESIS-OPTION-", 1_000, "O")
};

test("maximum-length imported prompt stays contained and renders HTML-looking text safely", async ({ page }) => {
  expect(maximumPrompt).toHaveLength(2_000);

  await openQuestionPackImporter(page);
  await uploadPack(page, "maximum-prompt.mathdrill.json", maximumPromptPack());

  const preview = page.getByTestId("question-pack-preview");
  await expect(preview).toContainText(htmlLookingText);
  await expectImportedTextWasNotExecuted(page);
  await expectTargetsContainedAtWidths(page, [
    preview.locator("p").filter({ hasText: maximumEnvelopeText.title }).first(),
    preview.getByText(maximumEnvelopeText.description, { exact: true }),
    preview.getByText(maximumEnvelopeText.publisher, { exact: true }),
    preview.getByText(maximumEnvelopeText.license, { exact: true }),
    preview.getByText(`1. ${maximumPrompt}`, { exact: true })
  ]);

  await page.getByRole("checkbox", { name: /I reviewed the answer keys/ }).check();
  await page.getByRole("button", { name: "Install Pack" }).click();
  const card = page.getByTestId("question-pack-maximum-prompt-reliability");
  await card.getByText(`Manage ${maximumEnvelopeText.title}`, { exact: true }).click();
  await expectTargetsContainedAtWidths(page, [
    card.getByText(maximumEnvelopeText.title, { exact: true }),
    card.getByText(maximumEnvelopeText.description, { exact: true }),
    card.getByText(maximumEnvelopeText.publisher, { exact: true }),
    card.locator("p").filter({ hasText: maximumEnvelopeText.license }),
    card.getByText("v1.0.0", { exact: true }),
    card.getByText("Fixed numeric", { exact: true }),
    card.getByRole("link", { name: "Practice intermediate (1)" })
  ]);
  await card.getByRole("link", { name: "Practice intermediate (1)" }).click();

  const runtimePrompt = page.getByTestId("active-question-prompt");
  await expect(runtimePrompt).toContainText(htmlLookingText);
  await expectImportedTextWasNotExecuted(page);

  await expectTargetsContainedAtWidths(page, [runtimePrompt]);
});

test("a 500-point scatter exhibit warns about readability but remains installable", async ({ page }) => {
  await openQuestionPackImporter(page);
  await uploadPack(page, "scatter-density.mathdrill.json", scatterDensityPack());

  const warnings = page.getByTestId("question-pack-review-warnings");
  await expect(warnings).toContainText(
    "500 rows exceed the readability guidance of 200 for scatterplot"
  );

  const installButton = page.getByRole("button", { name: "Install Pack" });
  await expect(installButton).toBeDisabled();
  await page.getByRole("checkbox", { name: /I reviewed the answer keys/ }).check();
  await expect(installButton).toBeEnabled();
  await installButton.click();
  await expect(page.getByTestId("question-pack-scatter-density-reliability")).toBeVisible();
});

for (const boundary of [
  { assetName: "question-pack-template-example.mathdrill.json", kind: "generated_template", packId: "example-generated-retail" },
  { assetName: "question-pack-exhibit-example.mathdrill.json", kind: "exhibit", packId: "example-delivery-channel-exhibit" },
  { assetName: "question-pack-market-sizing-example.mathdrill.json", kind: "market_sizing", packId: "example-neighborhood-market-sizing" },
  { assetName: "question-pack-benchmark-example.mathdrill.json", kind: "benchmark", packId: "example-foundations-benchmark" },
  { assetName: "question-pack-case-questioning-example.mathdrill.json", kind: "case_practice", packId: "customer-retention-questioning" }
] as const) {
  test(`maximum-length ${boundary.kind} text stays contained in preview and runtime`, async ({ page }) => {
    await openQuestionPackImporter(page);
    await uploadPack(page, `${boundary.kind}-maximum-text.mathdrill.json`, maximumSpecializedTextPack(boundary));
    await expectImportedTextWasNotExecuted(page);
    const exactJson = page.getByTestId("question-pack-exact-json-review");
    await exactJson.locator("summary").click();
    const exactJsonControl = exactJson.getByLabel("Complete normalized package JSON");
    expect(await exactJsonControl.inputValue()).toContain(maximumPrompt);
    await expectTargetsContainedAtWidths(page, [exactJsonControl]);

    await page.getByRole("checkbox", { name: /I reviewed the answer keys/ }).check();
    await page.getByRole("button", { name: "Install Pack" }).click();
    const card = page.getByTestId(`question-pack-${boundary.packId}`);
    await openSpecializedRuntime(page, card, boundary.kind);
    await expect(runtimeMaximumText(page, boundary.kind)).toContainText(htmlLookingText);
    await expectImportedTextWasNotExecuted(page);

    await expectTargetsContainedAtWidths(page, [runtimeMaximumText(page, boundary.kind)]);
  });
}

test("maximum drill guidance and feedback remain readable through the session summary", async ({ page }) => {
  test.slow();
  await openQuestionPackImporter(page);
  await uploadPack(page, "maximum-drill-guidance.mathdrill.json", maximumDrillGuidancePack());
  const card = await installUploadedPack(page, "example-retail-practice");
  const practiceLink = card.getByRole("link", { name: "Practice beginner (1)" });
  const practiceHref = await practiceLink.getAttribute("href");

  if (practiceHref === null) throw new Error("Expected a fixed-pack practice link.");
  const practiceUrl = new URL(practiceHref, "http://127.0.0.1:3000");
  practiceUrl.searchParams.set("feedbackMode", "instant");
  await page.goto(`${practiceUrl.pathname}${practiceUrl.search}`);

  await expectTargetsContainedAtWidths(page, [
    page.getByTestId("active-question-prompt")
  ]);

  await page.getByLabel("Answer", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  const feedback = page.getByTestId("active-feedback-panel");
  await expect(feedback).toBeVisible();
  await expectTargetsContainedAtWidths(page, [
    feedback.getByText(maximumDrillText.feedback, { exact: true }),
    feedback.locator("p").filter({ hasText: maximumDrillText.shortcut })
  ]);

  await page.getByRole("button", { name: "View summary" }).click();
  await page.getByText("Question Review", { exact: true }).waitFor();
  await page.locator("summary").filter({ hasText: "Worked solution" }).click();
  const summary = page.locator("main");
  await expectTargetsContainedAtWidths(page, [
    summary.getByText(`1. ${maximumDrillText.prompt}`, { exact: true }),
    summary.getByText(maximumDrillText.hint, { exact: true }),
    summary.getByText(maximumDrillText.feedback, { exact: true }),
    summary.locator("p").filter({ hasText: maximumDrillText.shortcut })
  ]);
});

test("maximum exhibit choice and solution text are contained without clipping", async ({ page }) => {
  await openQuestionPackImporter(page);
  await uploadPack(page, "maximum-exhibit-choice.mathdrill.json", maximumExhibitChoicePack());
  const card = await installUploadedPack(page, "example-visualization-cookbook");
  await card.getByRole("link", { name: "Open Exhibits" }).click();

  const choice = page.getByTestId("exhibit-answer-panel").getByText(maximumExhibitText.choice, { exact: true });
  await expectTargetsContainedAtWidths(page, [choice]);
  await page.getByRole("radio", { name: maximumExhibitText.choice }).check();
  await page.getByRole("button", { name: "Submit Answer" }).click();

  const solution = page.getByTestId("exhibit-solution-panel");
  await expect(solution).toBeVisible();
  await expectTargetsContainedAtWidths(page, [
    solution.locator("p").filter({ hasText: maximumExhibitText.choice }),
    solution.getByText(maximumExhibitText.solution, { exact: true }),
    solution.getByText(maximumExhibitText.step, { exact: true })
  ]);
});

test("a custom exhibit sprint keeps imported feedback and summary text contained", async ({ page }) => {
  test.slow();
  await openQuestionPackImporter(page);
  await uploadPack(page, "maximum-exhibit-sprint.mathdrill.json", maximumExhibitSprintPack());
  await installUploadedPack(page, "example-visualization-cookbook");
  await page.goto("/exhibits/sprint?pack=example-visualization-cookbook");
  await page.getByLabel("3").check();
  await page.getByRole("button", { name: "Start Exhibit Sprint" }).click();

  for (let index = 0; index < 3; index += 1) {
    await expectTargetsContainedAtWidths(page, [
      page.getByTestId("exhibit-sprint-prompt").getByText(maximumExhibitText.prompt, { exact: true })
    ]);
    await page.getByRole("radio", { name: maximumExhibitText.choice }).check();
    await page.getByRole("button", { name: "Submit Answer" }).click();
    const feedback = page.getByTestId("exhibit-sprint-feedback");
    await expectTargetsContainedAtWidths(page, [
      feedback.locator("p").filter({ hasText: maximumExhibitText.choice }),
      feedback.getByText(maximumExhibitText.step, { exact: true })
    ]);
    await page
      .getByRole("button", { name: index === 2 ? "View Summary" : "Next Question" })
      .click();
  }

  const summary = page.getByTestId("exhibit-sprint-summary");
  await expectTargetsContainedAtWidths(page, [
    summary.getByText(maximumExhibitText.datasetTitle, { exact: true }).first(),
    summary.getByText(maximumExhibitText.prompt, { exact: true }).first()
  ]);
});

test("maximum market-sizing labels, helpers, choices, and sense-check text stay contained", async ({ page }) => {
  await openQuestionPackImporter(page);
  await uploadPack(page, "maximum-market-fields.mathdrill.json", maximumMarketSizingFieldsPack());
  const card = await installUploadedPack(page, "example-neighborhood-market-sizing");
  await card.getByRole("link", { name: "Open Market sizing" }).click();

  const numericField = page.getByTestId("market-sizing-field-addressable-population");
  const choiceField = page.getByTestId("market-sizing-field-reliability-choice");
  const choiceControl = choiceField.locator("select");
  await choiceControl.selectOption("maximum-choice");
  await expect(choiceControl.locator("option:checked")).toHaveText(maximumMarketText.choice);
  const selectedChoiceDisplay = page.getByTestId("market-sizing-selected-choice-reliability-choice");
  const selectedChoiceText = selectedChoiceDisplay.getByText(maximumMarketText.choice, { exact: true });
  await expect(selectedChoiceText).toBeVisible();
  await expectTargetsContainedAtWidths(page, [
    numericField.getByText(maximumMarketText.stepLabel, { exact: true }),
    numericField.getByText(maximumMarketText.helper, { exact: true }),
    selectedChoiceText
  ]);
  await expectNativeControlContainedAtWidths(page, choiceControl);

  await numericField.locator("input").fill("150000");
  await page.getByRole("button", { name: "Continue to Calculation" }).click();
  await page.getByRole("button", { name: "Continue to Final Answer" }).click();
  await page.getByLabel(/Final answer/).fill("150000");
  await page.getByRole("button", { name: "Submit Answer" }).click();

  const reviewSenseCheck = page
    .getByTestId("market-sizing-review-section")
    .getByText(maximumMarketText.senseCheck, { exact: true });
  const summarySenseCheck = page
    .locator("main > aside")
    .getByText(maximumMarketText.senseCheck, { exact: true });
  await expectTargetsContainedAtWidths(page, [reviewSenseCheck, summarySenseCheck]);
});

test("maximum benchmark title, description, score band, and history text stay contained", async ({ page }) => {
  test.slow();
  await openQuestionPackImporter(page);
  await uploadPack(page, "maximum-benchmark-surfaces.mathdrill.json", maximumBenchmarkSurfacesPack());
  const card = await installUploadedPack(page, "example-foundations-benchmark");
  await card.getByRole("link", { name: "Open Benchmarks" }).click();

  const benchmarkCard = page.locator("article").filter({ hasText: maximumBenchmarkText.title }).first();
  await expectTargetsContainedAtWidths(page, [
    benchmarkCard.getByText(maximumBenchmarkText.title, { exact: true }),
    benchmarkCard.getByText(maximumBenchmarkText.description, { exact: true })
  ]);

  await page.getByRole("link", { name: "Begin Benchmark" }).click();
  await page.getByLabel("Answer", { exact: true }).fill("300");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByText("Session saved on this device.")).toBeVisible();

  await page.goto("/benchmark?pack=example-foundations-benchmark");
  await page.getByTestId("benchmark-history-disclosure").locator("summary").click();
  const history = page.getByTestId("benchmark-history");
  await expect(history.getByText(maximumBenchmarkText.band, { exact: true }).first()).toBeVisible();
  await expectTargetsContainedAtWidths(page, [
    history.getByText(maximumBenchmarkText.title, { exact: true }).first(),
    history.getByText(maximumBenchmarkText.band, { exact: true }).first(),
    history.getByTestId("benchmark-history-results-table").getByText(maximumBenchmarkText.title, { exact: true }),
    history.getByTestId("benchmark-history-results-table").getByText(maximumBenchmarkText.band, { exact: true })
  ]);
});

test("maximum imported text stays contained across every version-two case-practice subtype", async ({ page }) => {
  test.slow();
  await openQuestionPackImporter(page);
  await uploadPack(page, "maximum-case-subtypes.mathdrill.json", maximumVersionTwoCasePack());
  await installUploadedPack(page, "example-harborfresh-case-practice");
  const packQuery = "pack=example-harborfresh-case-practice";

  for (const surface of [
    { route: "structuring", text: maximumCaseText.structuring },
    { route: "brainstorming", text: maximumCaseText.brainstorming },
    { route: "synthesis", text: maximumCaseText.synthesis },
    { route: "lessons", text: maximumCaseText.lesson }
  ]) {
    await page.goto(`/case-practice/${surface.route}?${packQuery}`);
    await expectTargetsContainedAtWidths(page, [page.getByText(surface.text, { exact: true })]);
  }

  await page.goto(`/case-practice/fit?${packQuery}`);
  await saveImpactStory(page);
  await page.getByRole("button", { name: "Rehearse" }).click();
  const rehearsal = page.locator("#fit-rehearsal");
  await expectTargetsContainedAtWidths(page, [
    rehearsal.locator("p").filter({ hasText: maximumCaseText.fitPrompt }),
    rehearsal.getByText(maximumCaseText.fitFollowUp, { exact: true })
  ]);

  await page.goto(`/case-practice?${packQuery}`);
  await page.getByRole("link", { name: "Open Neighborhood pickup rollout" }).click();
  await expectTargetsContainedAtWidths(page, [page.getByText(maximumCaseText.fullCaseObjective, { exact: true })]);
});

test("maximum version-three text stays contained through every full-case stage and review", async ({ page }) => {
  test.slow();
  await openQuestionPackImporter(page);
  await uploadPack(page, "maximum-v3-case.mathdrill.json", maximumVersionThreeCasePack());
  await installUploadedPack(page, "aster-bikes-mobile-repair-full-case");
  const packQuery = "pack=aster-bikes-mobile-repair-full-case";

  await page.goto(`/case-practice/questioning?${packQuery}`);
  await expectTargetsContainedAtWidths(page, [
    page.getByText(maximumCaseText.v3QuestioningSituation, { exact: true })
  ]);

  await page.goto(`/case-practice?${packQuery}`);
  await page.getByRole("link", { name: "Open Mobile repair van rollout" }).click();
  await expectTargetsContainedAtWidths(page, [
    page.getByText(maximumCaseText.v3FullCaseSituation, { exact: true }),
    page.getByText(maximumCaseText.v3QuestioningObjective, { exact: true })
  ]);

  const questioningStage = page.locator('section[aria-labelledby="questioning-stage-heading"]');
  const questionInputs = questioningStage.locator("textarea");
  for (let index = 0; index < 4; index += 1) {
    await questionInputs.nth(index).fill(`Question ${index + 1}`);
  }
  await page.getByRole("button", { name: "Continue to Structure" }).click();

  const structureStage = page.locator('section[aria-labelledby="structure-stage-heading"]');
  await expectTargetsContainedAtWidths(page, [
    structureStage.getByText(maximumCaseText.v3StructureObjective, { exact: true })
  ]);
  await structureStage.getByRole("radio").first().check();
  await structureStage.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Continue to Exhibit and math" }).click();

  const calculationStage = page.locator('section[aria-labelledby="calculation-stage-heading"]');
  await expectTargetsContainedAtWidths(page, [
    calculationStage.getByText(maximumCaseText.v3ExhibitTitle, { exact: true }).first(),
    calculationStage.getByText(maximumCaseText.v3CalculationPrompt, { exact: true })
  ]);
  await page.locator("#full-case-calculation").fill("11900");
  await page.getByRole("button", { name: "Continue to Brainstorm" }).click();

  const brainstormStage = page.locator('section[aria-labelledby="brainstorm-stage-heading"]');
  await expectTargetsContainedAtWidths(page, [
    brainstormStage.getByText(maximumCaseText.v3Brainstorming, { exact: true }),
    brainstormStage.getByText(maximumCaseText.v3BrainstormingIdea, { exact: true })
  ]);
  const ideas = brainstormStage.getByRole("checkbox", { name: /^Include / });
  for (let index = 0; index < 3; index += 1) await ideas.nth(index).check();
  const priorities = brainstormStage.getByRole("checkbox", { name: /^Prioritize / });
  await priorities.nth(0).check();
  await priorities.nth(1).check();
  await page.getByRole("button", { name: "Continue to Synthesize" }).click();

  const synthesisStage = page.locator('section[aria-labelledby="synthesis-stage-heading"]');
  await expectTargetsContainedAtWidths(page, [
    synthesisStage.getByText(maximumCaseText.v3SynthesisDecision, { exact: true }),
    synthesisStage.getByText(maximumCaseText.v3SynthesisOption, { exact: true })
  ]);
  const synthesisOptions = synthesisStage.getByRole("radio");
  for (const index of [0, 2, 4, 6]) await synthesisOptions.nth(index).check();
  await page.getByRole("button", { name: "Complete Case" }).click();

  await expect(page.getByTestId("full-case-total-score")).toBeVisible();
  await expectTargetsContainedAtWidths(page, [
    page.getByText(maximumCaseText.v3CalculationStep, { exact: true }),
    page.getByText(maximumCaseText.v3ModelClose, { exact: true })
  ]);
});

async function openQuestionPackImporter(page: Page): Promise<void> {
  await page.goto("/settings");
  await page.locator("summary").filter({ hasText: "Content Packs" }).click();
}

async function uploadPack(page: Page, name: string, payload: object): Promise<void> {
  await page.getByLabel("Choose a question pack").setInputFiles({
    buffer: Buffer.from(JSON.stringify(payload)),
    mimeType: "application/json",
    name
  });
  await expect(page.getByTestId("question-pack-preview")).toBeVisible();
}

async function installUploadedPack(page: Page, packId: string): Promise<Locator> {
  await page.getByRole("checkbox", { name: /I reviewed the answer keys/ }).check();
  await page.getByRole("button", { name: "Install Pack" }).click();
  const card = page.getByTestId(`question-pack-${packId}`);
  await expect(card).toBeVisible();
  return card;
}

async function expectNoPageLevelHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const overflow = Math.max(
          0,
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
            viewportWidth
        );
        if (overflow === 0) return "none";

        const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
          .map((element) => ({
            className: element.className,
            right: Math.round(element.getBoundingClientRect().right),
            tagName: element.tagName,
            testId: element.dataset.testid
          }))
          .filter((element) => element.right > viewportWidth + 1)
          .slice(0, 5);

        return JSON.stringify({ offenders, overflow, viewportWidth });
      })
    )
    .toBe("none");
}

async function expectTargetsContainedAtWidths(page: Page, targets: readonly Locator[]): Promise<void> {
  for (const width of responsiveWidths) {
    await page.setViewportSize({ height: 900, width });
    await expectNoPageLevelHorizontalOverflow(page);

    for (const target of targets) {
      await expect(target).toBeVisible();
      const result = await target.evaluate((element) => {
        const tolerance = 1;
        let box = element as HTMLElement;

        while (box.clientWidth === 0 && box.parentElement !== null) box = box.parentElement;

        const boxRect = box.getBoundingClientRect();
        let ancestor = box.parentElement;
        let intentionalScroll = false;

        while (ancestor !== null) {
          const style = getComputedStyle(ancestor);
          const ancestorRect = ancestor.getBoundingClientRect();
          const targetCrossesAncestor =
            boxRect.left < ancestorRect.left - tolerance ||
            boxRect.right > ancestorRect.right + tolerance;

          if (targetCrossesAncestor && style.overflowX === "hidden") {
            return {
              ancestor: ancestor.tagName,
              clientWidth: box.clientWidth,
              scrollWidth: box.scrollWidth,
              status: "clipped"
            };
          }
          if (
            targetCrossesAncestor &&
            (style.overflowX === "auto" || style.overflowX === "scroll")
          ) {
            intentionalScroll = true;
          }
          ancestor = ancestor.parentElement;
        }

        const style = getComputedStyle(box);
        const fitsOwnBox = box.scrollWidth <= box.clientWidth + tolerance;
        if (!fitsOwnBox && style.overflowX === "hidden") {
          return {
            clientWidth: box.clientWidth,
            scrollWidth: box.scrollWidth,
            status: "clipped"
          };
        }
        if (fitsOwnBox || intentionalScroll) {
          return {
            clientWidth: box.clientWidth,
            scrollWidth: box.scrollWidth,
            status: "contained"
          };
        }

        ancestor = box.parentElement;
        while (ancestor !== null) {
          const ancestorStyle = getComputedStyle(ancestor);
          if (
            ancestor.scrollWidth > ancestor.clientWidth + tolerance &&
            (ancestorStyle.overflowX === "auto" || ancestorStyle.overflowX === "scroll")
          ) {
            return {
              ancestor: ancestor.tagName,
              clientWidth: box.clientWidth,
              scrollWidth: box.scrollWidth,
              status: "contained"
            };
          }
          ancestor = ancestor.parentElement;
        }

        return {
          clientWidth: box.clientWidth,
          scrollWidth: box.scrollWidth,
          status: "overflow"
        };
      });

      expect(result, `Imported text was not contained at ${width}px.`).toMatchObject({
        status: "contained"
      });
    }
  }
}

async function expectNativeControlContainedAtWidths(page: Page, control: Locator): Promise<void> {
  for (const width of responsiveWidths) {
    await page.setViewportSize({ height: 900, width });
    await expectNoPageLevelHorizontalOverflow(page);
    await expect(control).toBeVisible();
    const contained = await control.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left >= -1 && rect.right <= document.documentElement.clientWidth + 1;
    });
    expect(contained, `Native control exceeded the ${width}px viewport.`).toBe(true);
  }
}

async function expectImportedTextWasNotExecuted(page: Page): Promise<void> {
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  expect(
    await page.evaluate(() => !("__questionPackHtmlExecuted" in window))
  ).toBe(true);
}

function maximumPromptPack() {
  return {
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "fixed_numeric",
    id: "maximum-prompt-reliability",
    packVersion: "1.0.0",
    title: maximumEnvelopeText.title,
    description: maximumEnvelopeText.description,
    publisher: maximumEnvelopeText.publisher,
    license: maximumEnvelopeText.license,
    questions: [
      {
        id: "maximum-prompt-question",
        type: "numeric",
        category: "business_math",
        tags: ["margin"],
        difficulty: "intermediate",
        prompt: maximumPrompt,
        answer: {
          value: 1,
          unit: "none",
          tolerance: { type: "absolute", value: 0 }
        },
        explanation: {
          short: "This synthetic question exercises the imported prompt boundary.",
          steps: ["Enter 1."]
        }
      }
    ]
  };
}

function maximumDrillGuidancePack() {
  const payload = loadPublicPack("question-pack-example.mathdrill.json");
  const question = firstObject(payload, "questions");
  const explanation = requiredObject(question, "explanation");

  payload.questions = [question];
  question.prompt = maximumDrillText.prompt;
  question.answer = {
    value: 1,
    unit: "none",
    roundingRule: "exact"
  };
  explanation.short = maximumDrillText.hint;
  explanation.steps = [maximumDrillText.feedback];
  explanation.shortcut = maximumDrillText.shortcut;
  return payload;
}

function maximumExhibitChoicePack() {
  const payload = loadPublicPack("question-pack-visualization-cookbook.mathdrill.json");
  const dataset = objectCollection(payload, "datasets")[1];
  const question = firstObject(dataset, "questions");
  const choices = objectCollection(question, "choices");
  const explanation = requiredObject(question, "explanation");

  payload.datasets = [dataset];
  choices[0].label = maximumExhibitText.choice;
  question.correctChoiceId = choices[0].id;
  explanation.short = maximumExhibitText.solution;
  explanation.steps = [maximumExhibitText.step];
  return payload;
}

function maximumExhibitSprintPack() {
  const payload = maximumExhibitChoicePack();
  const dataset = firstObject(payload, "datasets");
  const question = firstObject(dataset, "questions");

  dataset.title = maximumExhibitText.datasetTitle;
  question.prompt = maximumExhibitText.prompt;
  dataset.questions = Array.from({ length: 3 }, (_, index) => ({
    ...structuredClone(question),
    id: `maximum-sprint-question-${index + 1}`
  }));
  return payload;
}

function maximumMarketSizingFieldsPack() {
  const payload = loadPublicPack("question-pack-market-sizing-example.mathdrill.json");
  const template = firstObject(payload, "templates");
  const numericStep = firstObject(template, "inputSteps");
  const finalFormula = requiredObject(template, "finalFormula");
  const senseCheck = requiredObject(template, "senseCheck");

  numericStep.label = maximumMarketText.stepLabel;
  numericStep.helperText = maximumMarketText.helper;
  template.inputSteps = [
    numericStep,
    {
      id: "reliability-choice",
      inputKind: "choice",
      label: "Reliability choice",
      options: [
        { id: "maximum-choice", label: maximumMarketText.choice },
        { id: "short-choice", label: "Short choice" }
      ],
      required: false
    }
  ];
  finalFormula.expression = "population";
  senseCheck.prompt = maximumMarketText.senseCheck;
  return payload;
}

function maximumBenchmarkSurfacesPack() {
  const payload = loadPublicPack("question-pack-benchmark-example.mathdrill.json");
  const benchmark = firstObject(payload, "benchmarks");
  const question = firstObject(benchmark, "questions");
  const answer = requiredObject(question, "answer");
  const excellentBand = objectCollection(benchmark, "scoreBands").find(
    (band) => band.label === "excellent"
  );

  if (excellentBand === undefined) throw new Error("Expected the excellent benchmark band.");
  benchmark.title = maximumBenchmarkText.title;
  benchmark.description = maximumBenchmarkText.description;
  benchmark.totalSessionSeconds = 30;
  benchmark.questions = [question];
  answer.unit = "none";
  excellentBand.title = maximumBenchmarkText.band;
  return payload;
}

function maximumVersionTwoCasePack() {
  const payload = loadPublicPack("question-pack-case-practice-example.mathdrill.json");
  const structuring = firstObject(payload, "structuringPrompts");
  const brainstorming = firstObject(payload, "brainstormingPrompts");
  const synthesis = firstObject(payload, "synthesisPrompts");
  const lesson = firstObject(payload, "lessons");
  const fit = firstObject(payload, "fitPrompts");
  const fullCase = firstObject(payload, "fullCases");
  const firstTheme = firstObject(brainstorming, "themes");
  const firstIdea = firstObject(firstTheme, "ideas");
  const recommendation = firstObject(requiredObject(synthesis, "options"), "recommendation");
  const workedExample = requiredObject(lesson, "workedExample");
  const fullCaseStructure = requiredObject(fullCase, "structure");

  structuring.situation = maximumCaseText.structuring;
  firstIdea.label = maximumCaseText.brainstorming;
  recommendation.label = maximumCaseText.synthesis;
  workedExample.prompt = maximumCaseText.lesson;
  fit.prompt = maximumCaseText.fitPrompt;
  fit.followUps = [maximumCaseText.fitFollowUp];
  fullCaseStructure.objective = maximumCaseText.fullCaseObjective;
  return payload;
}

function maximumVersionThreeCasePack() {
  const payload = loadPublicPack("question-pack-v3-full-case-example.mathdrill.json");
  const fullCase = firstObject(payload, "fullCases");
  const questioning = requiredObject(fullCase, "questioning");
  const structure = requiredObject(fullCase, "structure");
  const exhibit = requiredObject(fullCase, "exhibit");
  const calculationQuestion = firstObject(exhibit, "questions");
  const calculationExplanation = requiredObject(calculationQuestion, "explanation");
  const brainstorming = requiredObject(fullCase, "brainstorming");
  const brainstormTheme = firstObject(brainstorming, "themes");
  const brainstormIdea = firstObject(brainstormTheme, "ideas");
  const synthesis = requiredObject(fullCase, "synthesis");
  const recommendation = firstObject(requiredObject(synthesis, "options"), "recommendation");

  fullCase.situation = maximumCaseText.v3FullCaseSituation;
  questioning.situation = maximumCaseText.v3QuestioningSituation;
  questioning.objective = maximumCaseText.v3QuestioningObjective;
  structure.objective = maximumCaseText.v3StructureObjective;
  exhibit.title = maximumCaseText.v3ExhibitTitle;
  calculationQuestion.prompt = maximumCaseText.v3CalculationPrompt;
  calculationExplanation.steps = [maximumCaseText.v3CalculationStep];
  brainstorming.question = maximumCaseText.v3Brainstorming;
  brainstormIdea.label = maximumCaseText.v3BrainstormingIdea;
  synthesis.decision = maximumCaseText.v3SynthesisDecision;
  synthesis.modelClose = maximumCaseText.v3ModelClose;
  recommendation.label = maximumCaseText.v3SynthesisOption;
  payload.questioningPrompts = [structuredClone(questioning)];
  return payload;
}

async function saveImpactStory(page: Page): Promise<void> {
  await page.getByLabel("Story title").fill("Imported prompt containment story");
  await page.getByLabel("Competency").selectOption("impact");
  await page.getByLabel("Situation", { exact: true }).fill("Situation");
  await page.getByLabel("Task", { exact: true }).fill("Task");
  await page.getByLabel("Action", { exact: true }).fill("Action");
  await page.getByLabel("Result", { exact: true }).fill("Result");
  await page.getByLabel("Reflection", { exact: true }).fill("Reflection");
  await page.getByRole("button", { name: "Save Story" }).click();
  await expect(page.getByText("Story saved", { exact: true })).toBeVisible();
}

function scatterDensityPack() {
  return {
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "exhibit",
    id: "scatter-density-reliability",
    packVersion: "1.0.0",
    title: "Scatter Density Reliability",
    datasets: [
      {
        id: "scatter-density-dataset",
        title: "Synthetic Scatter Density",
        description: "Five hundred synthetic observations for deterministic readability testing.",
        unit: "none",
        columns: [
          { id: "observation", label: "Observation", role: "dimension", valueType: "text" },
          { id: "x", label: "X value", role: "metric", valueType: "number", unit: "none" },
          { id: "y", label: "Y value", role: "metric", valueType: "number", unit: "none" }
        ],
        rows: Array.from({ length: 500 }, (_, index) => ({
          id: `point-${String(index + 1).padStart(3, "0")}`,
          cells: {
            observation: `Observation ${index + 1}`,
            x: index + 1,
            y: (index + 1) * 2
          }
        })),
        visualization: {
          type: "scatterplot",
          title: "Synthetic relationship",
          categoryColumnId: "observation",
          xColumnId: "x",
          yColumnIds: ["y"]
        },
        questions: [
          {
            id: "last-y-value",
            responseType: "numeric",
            difficulty: "beginner",
            prompt: "What is the y value of the final observation?",
            tags: ["multiplication"],
            answer: {
              value: 1_000,
              unit: "none",
              roundingRule: "exact"
            },
            explanation: {
              short: "The final observation doubles 500.",
              steps: ["500 × 2 = 1,000."]
            }
          }
        ]
      }
    ]
  };
}

function maximumSpecializedTextPack(boundary: {
  assetName: string;
  kind: "benchmark" | "case_practice" | "exhibit" | "generated_template" | "market_sizing";
}) {
  const payload = JSON.parse(
    readFileSync(resolve(process.cwd(), "public", boundary.assetName), "utf8")
  ) as Record<string, unknown>;

  if (boundary.kind === "generated_template") {
    firstObject(payload, "templates").promptTemplate = maximumPrompt;
  } else if (boundary.kind === "exhibit") {
    firstObject(firstObject(payload, "datasets"), "questions").prompt = maximumPrompt;
  } else if (boundary.kind === "market_sizing") {
    firstObject(payload, "templates").prompt = maximumPrompt;
  } else if (boundary.kind === "benchmark") {
    firstObject(firstObject(payload, "benchmarks"), "questions").prompt = maximumPrompt;
  } else {
    firstObject(payload, "questioningPrompts").situation = maximumPrompt;
  }

  return payload;
}

function firstObject(value: Record<string, unknown>, key: string): Record<string, unknown> {
  const collection = objectCollection(value, key);
  if (collection[0] === undefined) {
    throw new Error(`Expected ${key} collection.`);
  }
  return collection[0];
}

function objectCollection(value: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const collection = value[key];
  if (
    !Array.isArray(collection) ||
    collection.some((item) => typeof item !== "object" || item === null || Array.isArray(item))
  ) {
    throw new Error(`Expected ${key} object collection.`);
  }
  return collection as Record<string, unknown>[];
}

function requiredObject(value: Record<string, unknown>, key: string): Record<string, unknown> {
  const item = value[key];
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    throw new Error(`Expected ${key} object.`);
  }
  return item as Record<string, unknown>;
}

function loadPublicPack(assetName: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), "public", assetName), "utf8")
  ) as Record<string, unknown>;
}

function unbrokenText(prefix: string, length: number, fill: string): string {
  if (prefix.length > length) throw new Error(`Prefix ${prefix} exceeds ${length} characters.`);
  return `${prefix}${fill.repeat(length - prefix.length)}`;
}

async function openSpecializedRuntime(
  page: Page,
  card: Locator,
  kind: "benchmark" | "case_practice" | "exhibit" | "generated_template" | "market_sizing"
): Promise<void> {
  if (kind === "generated_template") {
    await card.getByRole("link", { name: /^Practice / }).first().click();
  } else if (kind === "exhibit") {
    await card.getByRole("link", { name: "Open Exhibits" }).click();
  } else if (kind === "market_sizing") {
    await card.getByRole("link", { name: "Open Market sizing" }).click();
  } else if (kind === "benchmark") {
    await card.getByRole("link", { name: "Open Benchmarks" }).click();
    await page.getByRole("link", { name: "Begin Benchmark" }).click();
  } else {
    await card.getByRole("link", { name: "Open Case practice" }).click();
    await page.getByRole("link", { name: "Open Questioning" }).click();
  }
}

function runtimeMaximumText(
  page: Page,
  kind: "benchmark" | "case_practice" | "exhibit" | "generated_template" | "market_sizing"
) {
  if (kind === "generated_template" || kind === "benchmark") return page.getByTestId("active-question-prompt");
  if (kind === "exhibit") return page.getByTestId("exhibit-question-prompt");
  return page.getByText(maximumPrompt, { exact: true }).first();
}
