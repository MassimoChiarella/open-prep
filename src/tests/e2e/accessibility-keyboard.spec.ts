import { expect, test, type Download, type Locator, type Page } from "@playwright/test";

import { benchmarkTests } from "../../data/questionBank/benchmarkTests";
import type { Question } from "../../lib/domain";

test("a keyboard user recovers from a drill error and reaches the summary", async ({ page }) => {
  await page.goto(
    "/drills/session?categories=arithmetic&tags=addition&count=1&feedbackMode=retry_first&hints=0&seed=keyboard-math"
  );

  const answerInput = page.getByLabel("Answer", { exact: true });
  await expectKeyboardFocus(answerInput);

  await page.keyboard.type("not a number");
  await page.keyboard.press("Enter");

  const errorStatus = page.getByRole("status").filter({ hasText: "Try again" });
  await expect(errorStatus).toContainText("Enter a valid number.");
  await expect(errorStatus).toContainText("Your first answer was not recorded.");
  await expect(errorStatus).toHaveAttribute("aria-live", "polite");
  await expectKeyboardFocus(answerInput);

  const prompt = await page.getByTestId("active-question-prompt").textContent();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(String(solveAdditionPrompt(prompt ?? "")));
  await page.keyboard.press("Enter");

  const feedbackStatus = page.getByRole("status").filter({ hasText: "Correct" });
  await expect(feedbackStatus).toContainText("Your answer");
  await expect(feedbackStatus).toHaveAttribute("aria-live", "polite");

  const summaryButton = page.getByRole("button", { name: "View summary" });
  await expectKeyboardFocus(summaryButton);
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Session Results" })).toBeVisible();
  await expect(page.getByText("Question Review", { exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Session saved on this device." })).toBeVisible();
});

test("a keyboard user chooses benchmark timing and completes the locked run", async ({ page }) => {
  const benchmark = benchmarkTests.find((candidate) => candidate.id === "beginner");
  if (benchmark === undefined) throw new Error("Missing beginner benchmark fixture.");

  await page.goto("/benchmark");

  const timingChoice = page.getByRole("combobox", { name: "Timing choice" });
  await tabTo(page, timingChoice);
  await page.keyboard.press("ArrowDown");
  await expect(timingChoice).toHaveValue("time_and_a_half");
  await expect(
    page.getByRole("status").filter({ hasText: "The standard limit is" })
  ).toContainText("Your limit will be");

  const rememberTiming = page.getByRole("checkbox", {
    name: "Remember this timing choice on this device"
  });
  await page.keyboard.press("Tab");
  await expectKeyboardFocus(rememberTiming);
  await page.keyboard.press("Space");
  await expect(rememberTiming).toBeChecked();

  const beginBenchmark = page.getByRole("link", { name: "Begin Benchmark" });
  await page.keyboard.press("Tab");
  await expectKeyboardFocus(beginBenchmark);
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/timingAccommodation=time_and_a_half/);
  await expect(page.getByTestId("active-timing-accommodation")).toContainText("Time and a half");

  const answerInput = page.getByLabel("Answer", { exact: true });
  for (const [index, question] of benchmark.questions.entries()) {
    await expect(
      page.getByText(`Question ${index + 1} of ${benchmark.questions.length}`)
    ).toBeVisible();
    await expectKeyboardFocus(answerInput);
    await page.keyboard.type(formatQuestionAnswer(question));
    await page.keyboard.press("Enter");
  }

  await expect(page.getByRole("heading", { name: "Session Results" })).toBeVisible();
  await expect(page.getByTestId("session-summary-timing")).toContainText("Time and a half");
  await expect(page.getByRole("status").filter({ hasText: "Session saved on this device." })).toBeVisible();
});

test(
  "a keyboard user answers an exhibit and receives saved status",
  { tag: "@browser-smoke" },
  async ({ page }) => {
    await page.goto("/exhibits");

    const answerInput = page.getByLabel("Answer", { exact: true });
    await tabTo(page, answerInput);
    await page.keyboard.type("$48.4M");

    const submitButton = page.getByRole("button", { name: "Submit Answer" });
    await tabTo(page, submitButton);
    await page.keyboard.press("Enter");

    const savedStatus = page
      .getByRole("status")
      .filter({ hasText: "Correct. Attempt saved on this device." });
    await expect(savedStatus).toBeVisible();
    await expect(savedStatus).toHaveAttribute("aria-live", "polite");
    await expect(page.getByTestId("exhibit-solution-panel")).toBeVisible();
    await expectKeyboardFocus(submitButton);
  }
);

test("a keyboard user completes every market-sizing stage without repeated entry", async ({ page }) => {
  await page.goto("/market-sizing");

  const fields = [
    [page.getByLabel("Population"), "3000000"],
    [page.getByLabel("Percent who buy prepared coffee"), "60%"],
    [page.getByLabel("Purchased cups per drinker per day"), "1"],
    [page.getByLabel("Purchase days per year"), "365"],
    [page.getByLabel("Average price per cup"), "$4"]
  ] as const;

  await tabTo(page, fields[0][0]);
  for (const [index, [field, value]] of fields.entries()) {
    await expectKeyboardFocus(field);
    await page.keyboard.type(value);
    await expect(field).toHaveValue(value);
    await page.keyboard.press("Tab");
    if (fields[index + 1] !== undefined) await expectKeyboardFocus(fields[index + 1][0]);
  }

  const senseCheck = page.getByRole("checkbox", { name: "Sense-check completed" });
  await expectKeyboardFocus(senseCheck);
  await page.keyboard.press("Space");
  await expect(senseCheck).toBeChecked();
  await expect(page.getByTestId("market-sizing-required-progress")).toContainText(
    "All required assumptions are filled."
  );

  const continueToCalculation = page.getByRole("button", { name: "Continue to Calculation" });
  await page.keyboard.press("Tab");
  await expectKeyboardFocus(continueToCalculation);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Calculation" })).toBeFocused();

  const backToAssumptions = page.getByRole("button", { name: "Back to Assumptions" });
  await page.keyboard.press("Tab");
  await expectKeyboardFocus(backToAssumptions);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Assumptions" })).toBeFocused();
  for (const [field, value] of fields) await expect(field).toHaveValue(value);
  await expect(senseCheck).toBeChecked();

  await tabTo(page, continueToCalculation);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Calculation" })).toBeFocused();

  const continueToFinalAnswer = page.getByRole("button", { name: "Continue to Final Answer" });
  await page.keyboard.press("Tab");
  await expectKeyboardFocus(backToAssumptions);
  await page.keyboard.press("Tab");
  await expectKeyboardFocus(continueToFinalAnswer);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Final Answer" })).toBeFocused();

  const finalAnswer = page.getByLabel("Final answer (Currency)");
  await page.keyboard.press("Tab");
  await expectKeyboardFocus(finalAnswer);
  await page.keyboard.type("$2.628B");
  await expect(page.getByTestId("market-sizing-final-answer-status")).toHaveCount(0);

  const submitAnswer = page.getByRole("button", { name: "Submit Answer" });
  await page.keyboard.press("Tab");
  await expectKeyboardFocus(page.getByRole("button", { name: "Back to Calculation" }));
  await page.keyboard.press("Tab");
  await expectKeyboardFocus(submitAnswer);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Sense-Check And Review" })).toBeFocused();
  await expect(page.getByTestId("market-sizing-review-result")).toContainText(
    "Final answer matches the calculated result."
  );

  const interpretation = page.getByRole("combobox", { name: "Interpretation" });
  await page.keyboard.press("Tab");
  await expectKeyboardFocus(interpretation);
  await page.keyboard.press("ArrowDown");
  await expect(interpretation).toHaveValue("plausible");

  const notes = page.getByLabel("Notes");
  await page.keyboard.press("Tab");
  await expectKeyboardFocus(notes);
  await page.keyboard.type("The implied annual spend per buyer is plausible.");

  const scoreDraft = page.getByRole("button", { name: "Score Draft" });
  await tabTo(page, page.getByRole("button", { name: "Back to Final Answer" }));
  await tabTo(page, scoreDraft);
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("market-sizing-score-summary")).toContainText("100% complete");
  await expect(page.getByRole("status").filter({ hasText: /saved on this device/i })).toBeVisible();
  await expectKeyboardFocus(page.getByRole("button", { name: "Score Again" }));
});

test("a keyboard user completes a representative case-practice action", async ({ page }) => {
  await page.goto("/case-practice/questioning");

  const questions = [
    "How did revenue from price and volume change across customer segments?",
    "Which food ingredient costs and supplier terms increased margin pressure?",
    "How did fulfillment and delivery costs per order change by region?"
  ];

  const firstQuestion = page.getByLabel("Question 1");
  await tabTo(page, firstQuestion);
  for (const [index, question] of questions.entries()) {
    const field = page.getByLabel(`Question ${index + 1}`);
    await expectKeyboardFocus(field);
    await page.keyboard.type(question);
    await page.keyboard.press("Tab");
    if (questions[index + 1] !== undefined) {
      await expectKeyboardFocus(page.getByLabel(`Question ${index + 2}`));
    }
  }

  const addQuestion = page.getByRole("button", { name: "Add Question" });
  await expectKeyboardFocus(addQuestion);
  await page.keyboard.press("Tab");

  const scoreQuestions = page.getByRole("button", { name: "Score Questions" });
  await expectKeyboardFocus(scoreQuestions);
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Question review" })).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "available to local progress" })
  ).toBeVisible();

  const retryCase = page.getByRole("button", { name: "Retry Case" });
  await tabTo(page, retryCase);
  await expectKeyboardFocus(retryCase);
});

test("a keyboard user imports, reviews, and installs a content pack without a trap", async ({ page }) => {
  await page.goto("/content-packs?view=import");

  const fileInput = page.getByLabel("Choose a question pack");
  await tabTo(page, fileInput);
  await fileInput.setInputFiles({
    buffer: Buffer.from(JSON.stringify(keyboardQuestionPack())),
    mimeType: "application/json",
    name: "keyboard-journey.mathdrill.json"
  });
  await expectKeyboardFocus(fileInput);
  await expect(page.getByTestId("question-pack-preview")).toContainText("Keyboard Journey Pack");

  const normalizedJsonSummary = page
    .locator("summary")
    .filter({ hasText: "Review the complete normalized package JSON" });
  await tabTo(page, normalizedJsonSummary);
  await page.keyboard.press("Enter");
  await expect(normalizedJsonSummary.locator("..")).toHaveAttribute("open", "");

  const normalizedJson = page.getByLabel("Complete normalized package JSON");
  await tabTo(page, normalizedJson);
  await tabTo(page, normalizedJsonSummary, "backward");
  await page.keyboard.press("Enter");
  await expect(normalizedJsonSummary.locator("..")).not.toHaveAttribute("open", "");
  await expectKeyboardFocus(normalizedJsonSummary);

  const reviewConfirmation = page.getByRole("checkbox", {
    name: /I reviewed the answer keys/
  });
  await page.keyboard.press("Tab");
  await expectKeyboardFocus(reviewConfirmation);
  await page.keyboard.press("Space");
  await expect(reviewConfirmation).toBeChecked();

  const installButton = page.getByRole("button", { name: "Install Pack" });
  await page.keyboard.press("Tab");
  await expectKeyboardFocus(installButton);
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("status").filter({ hasText: "Question pack installed on this device." })
  ).toBeVisible();

  const installedView = page.getByRole("link", { name: "Installed", exact: true });
  await tabTo(page, installedView);
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { level: 2, name: "Installed" })).toBeVisible();
  const installedPack = page.getByTestId("question-pack-keyboard-journey");
  await expect(installedPack).toContainText("Keyboard Journey Pack");
  await tabTo(
    page,
    installedPack.getByRole("link", { name: "Practice beginner (1)" })
  );
});

test("a keyboard user protects storage and round-trips local backups", async ({ page }) => {
  await page.addInitScript(() => {
    let persistCalls = 0;

    Object.defineProperty(window, "__openPrepPersistCalls", {
      configurable: true,
      get: () => persistCalls
    });
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: {
        persist: async () => {
          persistCalls += 1;
          return true;
        },
        persisted: async () => false
      }
    });
  });

  await page.goto("/settings");

  const localDataSummary = page.getByTestId("settings-local-data").locator("summary");
  await tabTo(page, localDataSummary);
  await page.keyboard.press("Enter");
  await expect(localDataSummary.locator("..")).toHaveAttribute("open", "");
  const appOrigin = new URL(page.url()).origin;
  const unexpectedTransmissions: string[] = [];
  page.on("request", (request) => {
    const method = request.method();
    if (
      new URL(request.url()).origin !== appOrigin ||
      (method !== "GET" && method !== "HEAD")
    ) {
      unexpectedTransmissions.push(`${method} ${request.url()}`);
    }
  });

  const protectLocalData = page.getByRole("button", { name: "Protect Local Data" });
  await tabTo(page, protectLocalData);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("status").filter({ hasText: "This browser reports persistent storage for this site." })
  ).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, "__openPrepPersistCalls"))).toBe(1);

  const standardExport = page.getByRole("button", { name: "Export Local Progress" });
  await tabTo(page, standardExport);
  const standardDownloadPromise = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  const standardDownload = await standardDownloadPromise;
  expect(standardDownload.suggestedFilename()).toMatch(/^open-prep-progress-.*\.json$/);
  await expect(
    page.getByRole("status").filter({ hasText: "Local progress export downloaded." })
  ).toBeVisible();

  const prepareBackup = page.getByRole("button", { name: "Prepare Complete Backup" });
  await tabTo(page, prepareBackup);
  await page.keyboard.press("Enter");

  const exportPreview = page.getByTestId("complete-backup-export-preview");
  await expect(exportPreview).toBeVisible();
  const exportConfirmation = page.getByRole("checkbox", {
    name: "I understand this download contains the selected cleartext data."
  });
  await tabTo(page, exportConfirmation);
  await page.keyboard.press("Space");
  await expect(exportConfirmation).toBeChecked();

  const completeDownloadButton = page.getByRole("button", { name: "Download Complete Backup" });
  await page.keyboard.press("Tab");
  await expectKeyboardFocus(completeDownloadButton);
  const completeDownloadPromise = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  const completeDownload = await completeDownloadPromise;
  const completeBackupBuffer = await readDownload(completeDownload);
  expect(completeDownload.suggestedFilename()).toMatch(/^open-prep-complete-backup-.*\.json$/);
  await expect(
    page.getByRole("status").filter({ hasText: "Complete backup downloaded." })
  ).toBeVisible();

  const restoreFile = page.getByLabel("Choose a complete backup file");
  await tabTo(page, restoreFile);
  await restoreFile.setInputFiles({
    buffer: completeBackupBuffer,
    mimeType: "application/json",
    name: completeDownload.suggestedFilename()
  });
  await expectKeyboardFocus(restoreFile);
  await expect(page.getByTestId("complete-backup-restore-preview")).toContainText(
    "Complete backup file is valid."
  );

  const restoreConfirmation = page.getByRole("checkbox", {
    name: "I understand the selected sections will be replaced on this device."
  });
  await tabTo(page, restoreConfirmation);
  await page.keyboard.press("Space");
  const restoreButton = page.getByRole("button", { name: "Restore Selected Sections" });
  await page.keyboard.press("Tab");
  await expectKeyboardFocus(restoreButton);
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("status").filter({ hasText: "Complete backup restored." })
  ).toBeVisible();
  expect(unexpectedTransmissions).toEqual([]);
});

test("a keyboard-opened native confirmation returns focus after cancellation", async ({ page }) => {
  await page.goto(
    "/drills/session?categories=arithmetic&tags=addition&count=1&feedbackMode=instant&hints=0&seed=keyboard-dialog"
  );

  const exitLink = page.getByRole("link", { name: "Exit to Drills" });
  await tabTo(page, exitLink, "backward");

  const dialogPromise = page.waitForEvent("dialog").then(async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    expect(dialog.message()).toContain("Leave this active session?");
    await dialog.dismiss();
  });
  await Promise.all([dialogPromise, page.keyboard.press("Enter")]);

  await expect(page).toHaveURL(/\/drills\/session/);
  await expect(exitLink).toBeFocused();
  await page.keyboard.press("Tab");
  await expectKeyboardFocus(page.getByLabel("Answer", { exact: true }));
});

async function tabTo(
  page: Page,
  target: Locator,
  direction: "backward" | "forward" = "forward"
): Promise<void> {
  await expect(target).toBeVisible();

  for (let attempt = 0; attempt < 160; attempt += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) {
      await expectKeyboardFocus(target);
      return;
    }

    await page.keyboard.press(direction === "forward" ? "Tab" : "Shift+Tab");
  }

  await expect(target).toBeFocused();
}

async function expectKeyboardFocus(target: Locator): Promise<void> {
  await expect(target).toBeFocused();
  await expect
    .poll(() => target.evaluate((element) => {
      const style = getComputedStyle(element);
      const hasOutline = style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0;
      const hasRing = style.boxShadow !== "none";

      return element.matches(":focus-visible") && (hasOutline || hasRing);
    }))
    .toBe(true);
}

async function readDownload(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  if (stream === null) throw new Error(`Unable to read ${download.suggestedFilename()}.`);

  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

  return Buffer.concat(chunks);
}

function solveAdditionPrompt(prompt: string): number {
  const match = prompt.match(/^What is (?<left>\d+) \+ (?<right>\d+)\?$/);
  if (match?.groups === undefined) throw new Error(`Unexpected generated prompt: ${prompt}`);

  return Number(match.groups.left) + Number(match.groups.right);
}

function formatQuestionAnswer(question: Question): string {
  return String(question.answer.unit === "percentage" ? question.answer.value * 100 : question.answer.value);
}

function keyboardQuestionPack() {
  return {
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "fixed_numeric",
    id: "keyboard-journey",
    packVersion: "1.0.0",
    title: "Keyboard Journey Pack",
    description: "A deterministic local fixture for keyboard-only installation coverage.",
    publisher: "Open Prep test fixtures",
    license: "CC-BY-4.0",
    questions: [
      {
        id: "keyboard-profit",
        type: "numeric",
        category: "business_math",
        tags: ["profit"],
        difficulty: "beginner",
        prompt: "Revenue is $12M and costs are $9M. What is profit?",
        answer: {
          value: 3_000_000,
          unit: "currency",
          tolerance: { type: "absolute", value: 1 }
        },
        explanation: {
          short: "Subtract costs from revenue.",
          steps: ["$12M - $9M = $3M."]
        }
      }
    ]
  };
}
