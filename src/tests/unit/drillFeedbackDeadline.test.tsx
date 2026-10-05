import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActiveDrillSession } from "@/features/drills/ActiveDrillSession";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

afterEach(() => vi.useRealTimers());

describe("whole-session feedback deadlines", () => {
  it.each(["instant", "retry_first"] as const)("continues the session clock through %s feedback and times out unseen questions once", async (feedbackMode) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T12:00:00.000Z"));
    const storage = new MemoryAppStorage();
    const created = createDrillSession({ seed: "feedback-deadline", startedAt: new Date().toISOString(), settings: { questionCount: 3, tags: ["addition"], feedbackMode, timeMode: "session", totalSessionSeconds: 10 } });
    await act(async () => { render(<ActiveDrillSession initialSession={created.session} questions={created.questions} storageFactory={() => storage} />); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: String(created.questions[0].answer.value) } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByRole("timer", { name: "Time remaining 0:07" })).toBeInTheDocument();
    expect(screen.getByTestId("active-feedback-panel")).toHaveTextContent("Correct.");
    await act(async () => { await vi.advanceTimersByTimeAsync(7001); });
    // React commits the timer update before its expiry effect queues the next task.
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByText("Session Results")).toBeInTheDocument();
    const saved = await storage.get("drill_sessions", created.session.id);
    expect(saved?.responses).toHaveLength(3);
    expect(saved?.responses[0]).toMatchObject({ isCorrect: true, timeTakenSeconds: 2 });
    for (const response of saved!.responses.slice(1)) expect(response).toMatchObject({ rawInput: "", timeTakenSeconds: 0, errorTypes: ["timeout"] });
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(await storage.getAll("responses")).toHaveLength(3);
  });

  it("does not carry Interview Math choices into a question hidden behind feedback", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T12:00:00.000Z"));
    const storage = new MemoryAppStorage();
    const created = createDrillSession({ seed: "interview-feedback-deadline", startedAt: new Date().toISOString(), settings: { categories: ["case_math"], questionCount: 2, feedbackMode: "instant", timeMode: "session", totalSessionSeconds: 10, caseRequireEquationSetup: true, caseRequireInterpretation: true } });
    const question = created.questions[0];
    const spec = question.metadata!.caseStyle!.interviewMath;
    await act(async () => { render(<ActiveDrillSession initialSession={created.session} questions={created.questions} storageFactory={() => storage} />); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    fireEvent.click(screen.getByLabelText(spec.equationOptions.find((option) => option.formulaCorrect && option.setupCorrect)!.label));
    fireEvent.click(screen.getByLabelText(spec.interpretationOptions.find((option) => option.isCorrect)!.label));
    fireEvent.change(screen.getByLabelText("2. Answer"), { target: { value: String(question.answer.value) } });
    fireEvent.change(screen.getByLabelText("Answer unit"), { target: { value: question.answer.unit ?? "none" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    // A late click after a throttled/background timer still observes the absolute deadline.
    vi.setSystemTime(new Date("2026-09-22T12:00:10.000Z"));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Next" })));
    const saved = await storage.get("drill_sessions", created.session.id);
    expect(saved?.responses).toHaveLength(2);
    expect(saved?.responses[1].timeTakenSeconds).toBe(0);
    expect(saved?.responses[1].selectedUnit).toBeUndefined();
    expect(saved?.responses[1].interviewMath?.equationOptionId).toBeUndefined();
    expect(saved?.responses[1].interviewMath?.interpretationOptionId).toBeUndefined();
  });

  it("preserves the per-question feedback pause", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T12:00:00.000Z"));
    const storage = new MemoryAppStorage();
    const created = createDrillSession({ seed: "per-question-feedback", startedAt: new Date().toISOString(), settings: { questionCount: 2, tags: ["addition"], timeMode: "per_question", secondsPerQuestion: 10 } });
    await act(async () => { render(<ActiveDrillSession initialSession={created.session} questions={created.questions} storageFactory={() => storage} />); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: String(created.questions[0].answer.value) } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(screen.getByRole("timer", { name: "Time remaining 0:08" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("timer", { name: "Time remaining 0:10" })).toBeInTheDocument();
    expect((await storage.get("drill_sessions", created.session.id))?.responses).toHaveLength(1);
  });
});
