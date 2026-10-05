import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActiveDrillSession } from "@/features/drills/ActiveDrillSession";
import { submitAnswer } from "@/features/drills/answerSubmission";
import { buildDrillDraftKey, persistInProgressDrillSession } from "@/features/drills/drillPersistence";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("drill recovery and timing", () => {
  it("blocks early answers and skips until the recovered session and its token are paired", async () => {
    const storage = new MemoryAppStorage();
    const settings = { questionCount: 2, tags: ["addition" as const], feedbackMode: "end_of_session" as const };
    const saved = createDrillSession({ seed: "recover-saved", sessionId: "saved-attempt", settings });
    const firstAnswer = submitAnswer({ session: saved.session, question: saved.questions[0], rawInput: String(saved.questions[0].answer.value), timeTakenSeconds: 1 });
    await persistInProgressDrillSession({
      draftKey: buildDrillDraftKey(window.location.pathname + window.location.search, saved.session.settings),
      session: firstAnswer.session, questions: saved.questions, storage
    });
    const fresh = createDrillSession({ seed: "recover-fresh", sessionId: "fresh-attempt", settings });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const getPage = storage.getPage.bind(storage);
    vi.spyOn(storage, "getPage").mockImplementationOnce(async (...args) => { await gate; return getPage(...args); });
    render(<ActiveDrillSession initialSession={fresh.session} questions={fresh.questions} storageFactory={() => storage} />);

    expect(screen.getByLabelText("Answer")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Skip" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    fireEvent.submit(screen.getByTestId("active-answer-panel"));
    expect(await storage.get("drill_sessions", fresh.session.id)).toBeUndefined();

    await act(async () => release());
    await waitFor(() => expect(screen.getByLabelText("Answer")).toBeEnabled());
    expect(screen.getByTestId("active-question-prompt")).toHaveTextContent(saved.questions[1].prompt);
    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: String(saved.questions[1].answer.value) } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(await screen.findByText("Session saved on this device.")).toBeInTheDocument();
    expect((await storage.get("drill_sessions", saved.session.id))?.responses).toHaveLength(2);
    expect(await storage.get("drill_sessions", fresh.session.id)).toBeUndefined();
    expect(screen.queryByText(/This attempt changed in another tab/)).not.toBeInTheDocument();
  });

  it("waits for recovery before expiring the saved question's original deadline", async () => {
    vi.useFakeTimers();
    const start = new Date("2026-10-04T00:00:00Z");
    vi.setSystemTime(start);
    const storage = new MemoryAppStorage();
    const created = createDrillSession({ seed: "delayed-timer", startedAt: start.toISOString(), settings: {
      questionCount: 2, tags: ["addition"], timeMode: "per_question", secondsPerQuestion: 20
    } });
    await persistInProgressDrillSession({
      draftKey: buildDrillDraftKey(window.location.pathname + window.location.search, created.session.settings),
      questionStartedAtMs: start.getTime(), session: created.session, questions: created.questions, storage
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const getPage = storage.getPage.bind(storage);
    vi.spyOn(storage, "getPage").mockImplementationOnce(async (...args) => { await gate; return getPage(...args); });
    await act(async () => { render(<ActiveDrillSession initialSession={created.session} questions={created.questions} storageFactory={() => storage} />); });
    await act(async () => { await vi.advanceTimersByTimeAsync(25_000); });
    expect(screen.getByLabelText("Answer")).toBeDisabled();
    expect(screen.queryByTestId("active-feedback-panel")).not.toBeInTheDocument();
    expect((await storage.get("drill_sessions", created.session.id))?.responses).toHaveLength(0);
    await act(async () => release());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByTestId("active-feedback-panel")).toHaveTextContent("Timeout");
    expect((await storage.get("drill_sessions", created.session.id))?.responses[0].timeTakenSeconds).toBe(20);
    expect(screen.queryByText(/This attempt changed in another tab/)).not.toBeInTheDocument();
  });

  it("refreshes a fresh timed attempt's clock as soon as a delayed empty recovery resolves", async () => {
    vi.useFakeTimers();
    const start = new Date("2026-10-04T00:00:00Z");
    vi.setSystemTime(start);
    const storage = new MemoryAppStorage();
    const created = createDrillSession({ seed: "fresh-delayed-timer", startedAt: start.toISOString(), settings: {
      questionCount: 2, tags: ["addition"], timeMode: "per_question", secondsPerQuestion: 20
    } });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const getPage = storage.getPage.bind(storage);
    vi.spyOn(storage, "getPage").mockImplementationOnce(async (...args) => { await gate; return getPage(...args); });
    await act(async () => { render(<ActiveDrillSession initialSession={created.session} questions={created.questions} storageFactory={() => storage} />); });
    vi.setSystemTime(start.getTime() + 25_000);
    await act(async () => release());
    expect(screen.getByRole("timer", { name: "Time remaining 0:00" })).toBeInTheDocument();
    expect(screen.getByLabelText("Answer")).toBeDisabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByTestId("active-feedback-panel")).toHaveTextContent("Timeout");
    expect((await storage.get("drill_sessions", created.session.id))?.responses[0].timeTakenSeconds).toBe(20);
  });

  it("recovers a final answered draft into its saved summary", async () => {
    const storage = new MemoryAppStorage();
    const created = createDrillSession({ seed: "final-draft", settings: { questionCount: 1, tags: ["addition"] } });
    const submitted = submitAnswer({ session: created.session, question: created.questions[0], rawInput: "0", timeTakenSeconds: 7 });
    await persistInProgressDrillSession({
      draftKey: buildDrillDraftKey(window.location.pathname + window.location.search, created.session.settings),
      session: submitted.session, questions: created.questions, storage
    });
    render(<ActiveDrillSession initialSession={created.session} questions={created.questions} storageFactory={() => storage} />);
    expect(await screen.findByText("Session saved on this device.")).toBeInTheDocument();
    expect(await storage.get("drill_sessions", created.session.id)).toMatchObject({
      score: expect.any(Object), endedAt: submitted.response.submittedAt
    });
    expect(await storage.getAll("responses")).toHaveLength(1);
  });

  it("records each session-timed answer and skip from the current question start", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T00:00:00Z"));
    const storage = new MemoryAppStorage();
    const created = createDrillSession({ seed: "answer-times", startedAt: new Date().toISOString(), settings: {
      questionCount: 3, tags: ["addition"], feedbackMode: "end_of_session", timeMode: "session", totalSessionSeconds: 120
    } });
    await act(async () => { render(<ActiveDrillSession initialSession={created.session} questions={created.questions} storageFactory={() => storage} />); });
    for (let index = 0; index < 2; index += 1) {
      await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
      fireEvent.change(screen.getByLabelText("Answer"), { target: { value: String(created.questions[index].answer.value) } });
      fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    }
    await act(async () => { await vi.advanceTimersByTimeAsync(7_000); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Skip" })); });
    expect((await storage.getAll("responses")).map((response) => response.timeTakenSeconds)).toEqual([10, 10, 7]);
  });

  it("persists the first question deadline and restores only its remaining time", async () => {
    vi.useFakeTimers();
    const start = new Date("2026-09-08T00:00:00Z");
    vi.setSystemTime(start);
    const storage = new MemoryAppStorage();
    const created = createDrillSession({ seed: "reload-timer", startedAt: start.toISOString(), settings: {
      questionCount: 1, tags: ["addition"], timeMode: "per_question", secondsPerQuestion: 20
    } });
    let first: ReturnType<typeof render>;
    await act(async () => { first = render(<ActiveDrillSession initialSession={created.session} questions={created.questions} storageFactory={() => storage} />); });
    expect(await storage.get("drill_sessions", created.session.id)).toMatchObject({ activeQuestionStartedAt: start.toISOString() });
    first!.unmount();
    vi.setSystemTime(start.getTime() + 15_000);
    await act(async () => { render(<ActiveDrillSession initialSession={created.session} questions={created.questions} storageFactory={() => storage} />); });
    expect(screen.getByRole("timer", { name: "Time remaining 0:05" })).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(5_001); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByTestId("active-feedback-panel")).toHaveTextContent("Timeout");
    expect((await storage.get("drill_sessions", created.session.id))?.responses[0].timeTakenSeconds).toBe(20);
  });

  it("caps the last question solve time at the session deadline after a clock jump", async () => {
    vi.useFakeTimers();
    const start = new Date("2026-09-08T00:00:00Z");
    vi.setSystemTime(start);
    const storage = new MemoryAppStorage();
    const created = createDrillSession({ seed: "session-jump", startedAt: start.toISOString(), settings: {
      questionCount: 2, tags: ["addition"], feedbackMode: "end_of_session", timeMode: "session", totalSessionSeconds: 60
    } });
    await act(async () => { render(<ActiveDrillSession initialSession={created.session} questions={created.questions} storageFactory={() => storage} />); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: String(created.questions[0].answer.value) } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    vi.setSystemTime(start.getTime() + 600_000);
    await act(async () => { await vi.advanceTimersByTimeAsync(251); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect((await storage.getAll("responses")).map((response) => response.timeTakenSeconds)).toEqual([10, 50]);
  });
});
