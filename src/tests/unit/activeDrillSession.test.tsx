import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActiveDrillSession } from "@/features/drills/ActiveDrillSession";
import { submitAnswer } from "@/features/drills/answerSubmission";
import {
  buildDrillDraftKey,
  persistInProgressDrillSession
} from "@/features/drills/drillPersistence";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { unitPreferenceOptions } from "@/features/drills/drillSettingsOptions";
import type { AppStoreName, AppStoreValue } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("ActiveDrillSession", () => {
  it("shows unit, timing, and rounding expectations beside the prompt", () => {
    const created = createDrillSession({
      seed: "active-question-expectations",
      startedAt: new Date().toISOString(),
      settings: { questionCount: 1, tags: ["addition"] }
    });
    const source = created.questions[0];
    const question = {
      ...source,
      answer: { ...source.answer, roundingRule: "nearest_0_1" as const, unit: "percentage" as const },
      metadata: {
        ...source.metadata,
        expectedTimeSeconds: 45,
        sourceType: source.metadata?.sourceType ?? ("manual" as const)
      }
    };

    render(<ActiveDrillSession initialSession={created.session} questions={[question]} />);

    const expectations = screen.getByLabelText("Question answer expectations");

    expect(within(expectations).getByText("Expected unit:")).toBeInTheDocument();
    expect(within(expectations).getByText("Percentage (%)")).toBeInTheDocument();
    expect(within(expectations).getByText("Expected time:")).toBeInTheDocument();
    expect(within(expectations).getByText("45 seconds")).toBeInTheDocument();
    expect(within(expectations).getByText("Rounding:")).toBeInTheDocument();
    expect(within(expectations).getByText("Nearest 0.1 percentage point")).toBeInTheDocument();
    expect(screen.getByLabelText("Answer")).toHaveAttribute(
      "aria-describedby",
      "active-question-prompt active-question-expectations"
    );
    expect(screen.queryByText("MVP")).not.toBeInTheDocument();
  });

  it("retries a failed completed-session save", async () => {
    const storage = new FailOnceStorage();
    const created = createDrillSession({
      seed: "active-save-retry",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { feedbackMode: "end_of_session", questionCount: 1, tags: ["addition"] }
    });
    storage.failNextCompletedSessionPut = true;

    render(
      <ActiveDrillSession
        initialSession={created.session}
        questions={created.questions}
        storageFactory={() => storage}
      />
    );

    fireEvent.change(screen.getByLabelText("Answer"), {
      target: { value: String(created.questions[0].answer.value) }
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    fireEvent.click(await screen.findByRole("button", { name: "Retry Save" }));

    expect(await screen.findByText("Session saved on this device.")).toBeInTheDocument();
    await waitFor(async () => {
      expect(await storage.get("drill_sessions", created.session.id)).toMatchObject({ score: expect.any(Object) });
    });
  });

  it("announces an in-progress save without claiming it is already saved", async () => {
    const storage = new PendingCompletedSaveStorage();
    const created = createDrillSession({
      seed: "active-save-pending",
      settings: { feedbackMode: "end_of_session", questionCount: 1, tags: ["addition"] }
    });

    render(
      <ActiveDrillSession
        initialSession={created.session}
        questions={created.questions}
        storageFactory={() => storage}
      />
    );

    fireEvent.change(screen.getByLabelText("Answer"), {
      target: { value: String(created.questions[0].answer.value) }
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    const saveStatus = await screen.findByTestId("local-save-status");

    expect(within(saveStatus).getByText("Save status")).toBeInTheDocument();
    expect(within(saveStatus).getByText("Saving on this device...")).toBeInTheDocument();
    expect(within(saveStatus).queryByText("Saved on this device")).not.toBeInTheDocument();
  });

  it("repeats a benchmark with its fixed identity and pack", async () => {
    const storage = new MemoryAppStorage();
    const created = createDrillSession({
      seed: "active-benchmark-repeat",
      settings: {
        feedbackMode: "end_of_session",
        questionCount: 1,
        questionPackId: "pack-one",
        tags: ["addition"],
        timeMode: "session",
        totalSessionSeconds: 120
      }
    });

    render(
      <ActiveDrillSession
        benchmarkId="beginner"
        initialSession={created.session}
        questions={created.questions}
        storageFactory={() => storage}
      />
    );

    fireEvent.change(screen.getByLabelText("Answer"), {
      target: { value: String(created.questions[0].answer.value) }
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByRole("link", { name: "Repeat Benchmark" })).toHaveAttribute(
      "href",
      "/benchmark/session?benchmark=beginner&pack=pack-one"
    );
  });

  it("keeps feedback on the displayed question and hides future prompts until Next", () => {
    const created = createDrillSession({
      seed: "active-feedback-progress",
      startedAt: new Date().toISOString(),
      settings: { questionCount: 2, tags: ["addition"] }
    });

    render(<ActiveDrillSession initialSession={created.session} questions={created.questions} />);

    const queue = screen.getByTestId("active-session-queue");
    expect(within(queue).queryByText(created.questions[1].prompt)).not.toBeInTheDocument();
    expect(within(queue).getByText("Upcoming question")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByTestId("active-session-progress")).toHaveTextContent("Reviewing question 1 of 2");
    expect(screen.getByTestId("active-question-prompt")).toHaveTextContent(created.questions[0].prompt);
    expect(within(queue).queryByText(created.questions[1].prompt)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByTestId("active-session-progress")).toHaveTextContent("Question 2 of 2");
    expect(screen.getByTestId("active-question-prompt")).toHaveTextContent(created.questions[1].prompt);
  });

  it("restores a matching draft and replaces it with the completed session", async () => {
    const storage = new MemoryAppStorage();
    const route = "/drills/session?categories=arithmetic&count=2";
    window.history.replaceState({}, "", route);
    const created = createDrillSession({
      seed: "active-draft",
      startedAt: "2026-06-02T00:00:00.000Z",
      settings: { questionCount: 2, tags: ["addition"] }
    });
    const submitted = submitAnswer({
      question: created.questions[0],
      rawInput: String(created.questions[0].answer.value),
      session: created.session,
      submittedAt: "2026-06-02T00:00:05.000Z",
      timeTakenSeconds: 5
    });
    const draftKey = buildDrillDraftKey(route, submitted.session.settings);

    await persistInProgressDrillSession({
      draftKey,
      questions: created.questions,
      session: submitted.session,
      storage
    });

    const fresh = createDrillSession({
      seed: "active-draft",
      startedAt: "2026-06-02T01:00:00.000Z",
      settings: submitted.session.settings
    });
    render(
      <ActiveDrillSession
        initialSession={fresh.session}
        questions={fresh.questions}
        storageFactory={() => storage}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("active-question-prompt")).toHaveTextContent(created.questions[1].prompt);
    });
    expect(screen.getByTestId("active-session-progress")).toHaveTextContent("1 answered / 1 left");

    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    fireEvent.click(screen.getByRole("button", { name: "View summary" }));

    await waitFor(async () => {
      expect(await storage.get("drill_sessions", submitted.session.id)).toMatchObject({
        id: submitted.session.id,
        score: expect.any(Object)
      });
    });
    expect((await storage.get("drill_sessions", submitted.session.id))?.draftKey).toBeUndefined();
  });

  it("provides hints, units, scratchpad feedback, and a fresh similar retry", () => {
    const created = createDrillSession({
      seed: "active-tools",
      startedAt: new Date().toISOString(),
      settings: {
        arithmeticNumberFormat: "decimal",
        arithmeticOperandSize: "small",
        arithmeticTermCount: 3,
        hintsEnabled: true,
        questionCount: 2,
        tags: ["addition"],
        unitPreference: "m"
      }
    });
    const firstPrompt = created.questions[0].prompt;

    render(<ActiveDrillSession initialSession={created.session} questions={created.questions} />);

    fireEvent.click(screen.getByRole("button", { name: "Show hint" }));
    expect(screen.getByText(created.questions[0].explanation.short)).toBeInTheDocument();

    const scratchpad = screen.getByLabelText("Private notes for this session");
    fireEvent.change(scratchpad, { target: { value: "Round, then adjust" } });
    fireEvent.change(screen.getByLabelText("Answer unit"), { target: { value: "m" } });
    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    const feedback = screen.getByTestId("active-feedback-panel");
    expect(within(feedback).getByText("0 (M)")).toBeInTheDocument();
    expect(within(feedback).getByText("Calculation error")).toBeInTheDocument();
    expect(within(feedback).getByText(/Shortcut:/)).toBeInTheDocument();

    fireEvent.click(within(feedback).getByRole("button", { name: "Retry similar question" }));

    expect(screen.getByTestId("active-question-prompt")).not.toHaveTextContent(firstPrompt);
    expect(screen.getByTestId("active-session-queue").querySelectorAll("li")).toHaveLength(3);
    expect(screen.getByTestId("active-session-progress")).toHaveTextContent("1 answered / 2 left");
    expect(screen.getByLabelText("Private notes for this session")).toHaveValue("Round, then adjust");
  });

  it("does not mix bundled similar questions into question-pack sessions", () => {
    const created = createDrillSession({
      seed: "active-pack-tools",
      startedAt: new Date().toISOString(),
      settings: { questionCount: 2, questionPackId: "installed-pack", tags: ["addition"] }
    });

    render(<ActiveDrillSession initialSession={created.session} questions={created.questions} />);

    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.queryByRole("button", { name: "Retry similar question" })).not.toBeInTheDocument();
  });

  it("records a skipped question and shows it explicitly in feedback", () => {
    const created = createDrillSession({
      seed: "active-skip",
      startedAt: new Date().toISOString(),
      settings: { questionCount: 2, tags: ["addition"] }
    });

    render(<ActiveDrillSession initialSession={created.session} questions={created.questions} />);

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    const feedback = screen.getByTestId("active-feedback-panel");
    expect(within(feedback).getByText("Skipped")).toBeInTheDocument();
    expect(within(feedback).getByText("Calculation error")).toBeInTheDocument();
    expect(screen.getByTestId("active-session-progress")).toHaveTextContent("1 answered / 1 left");
  });

  it("uses the prompt percentage unit for a natural numeric entry", () => {
    const created = createDrillSession({
      seed: "active-percentage-unit",
      startedAt: new Date().toISOString(),
      settings: {
        categories: ["growth_compounding"],
        questionCount: 1,
        tags: ["cagr"]
      }
    });

    render(<ActiveDrillSession initialSession={created.session} questions={created.questions} />);

    fireEvent.change(screen.getByLabelText("Answer"), {
      target: { value: String(created.questions[0].answer.value * 100) }
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByTestId("active-feedback-panel")).toHaveTextContent("Correct.");
  });

  it("auto-detects Interview Math metadata for retry-compatible specialized scoring", () => {
    const created = createDrillSession({
      seed: "active-case-requirements",
      startedAt: new Date().toISOString(),
      settings: {
        caseCalculationStepCount: 2,
        caseIndustry: "retail",
        caseRequireEquationSetup: false,
        caseRequireInterpretation: true,
        categories: ["case_math"],
        difficulty: "beginner",
        questionCount: 1
      }
    });
    const question = created.questions[0];
    const correctInterpretation = question.metadata?.caseStyle?.interviewMath.interpretationOptions.find(
      (option) => option.isCorrect
    );

    render(
      <ActiveDrillSession
        initialSession={created.session}
        questions={created.questions}
      />
    );

    expect(screen.getByText("1. Equation setup (optional)")).toBeInTheDocument();
    expect(screen.getByText("3. Interpretation (required)")).toBeInTheDocument();
    expect(screen.queryByText("Skip interpretation")).not.toBeInTheDocument();
    expect(Array.from(screen.getByLabelText("Answer unit").querySelectorAll("option"), ({ value }) => value)).toEqual([
      "",
      ...unitPreferenceOptions.map(({ value }) => value)
    ]);

    fireEvent.change(screen.getByLabelText("2. Answer"), { target: { value: String(question.answer.value) } });
    fireEvent.change(screen.getByLabelText("Answer unit"), { target: { value: "m" } });
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();

    fireEvent.click(screen.getByLabelText(correctInterpretation?.label ?? ""));
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByTestId("active-feedback-panel")).toHaveTextContent("required components are correct");
  });
});

class FailOnceStorage extends MemoryAppStorage {
  failNextCompletedSessionPut = false;

  override async put<TStore extends AppStoreName>(
    storeName: TStore,
    value: AppStoreValue<TStore>
  ): Promise<void> {
    if (
      this.failNextCompletedSessionPut &&
      storeName === "drill_sessions" &&
      (value as { score?: unknown }).score !== undefined
    ) {
      this.failNextCompletedSessionPut = false;
      throw new Error("Injected one-time save failure.");
    }

    await super.put(storeName, value);
  }
}

class PendingCompletedSaveStorage extends MemoryAppStorage {
  override async put<TStore extends AppStoreName>(
    storeName: TStore,
    value: AppStoreValue<TStore>
  ): Promise<void> {
    if (storeName === "drill_sessions" && (value as { score?: unknown }).score !== undefined) {
      return new Promise<void>(() => undefined);
    }

    await super.put(storeName, value);
  }
}
