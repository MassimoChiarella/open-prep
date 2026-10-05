import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { benchmarkTests } from "@/data/questionBank/benchmarkTests";
import { I18nProvider, LanguageSelect } from "@/features/i18n/I18nProvider";
import { localePreferenceStorageKey } from "@/features/i18n/i18n";
import { QuestionPackBenchmarkSession } from "@/features/question-packs/SpecializedQuestionPackContent";
import { questionPackPoolPreferenceStorageKey } from "@/features/question-packs/questionPackPoolPreference";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

afterEach(() => {
  cleanup();
  window.localStorage.removeItem(localePreferenceStorageKey);
  window.localStorage.removeItem(questionPackPoolPreferenceStorageKey);
});

const benchmark = {
  ...benchmarkTests[0],
  questions: benchmarkTests[0].questions.slice(0, 2),
  settings: { ...benchmarkTests[0].settings, questionCount: 2 }
};

describe("benchmark locale transitions", () => {
  it("retains an unsubmitted answer and its original session across equivalent content and language updates", async () => {
    const storage = new MemoryAppStorage();
    const storageFactory = () => storage;
    const content = () => (
      <I18nProvider>
        <LanguageSelect />
        <QuestionPackBenchmarkSession benchmarkId={benchmark.id} builtInBenchmarks={[{ ...benchmark }]} storageFactory={storageFactory} />
      </I18nProvider>
    );
    const view = render(content());
    await waitFor(() => expect(screen.getByLabelText("Answer")).toBeEnabled());
    const original = (await storage.getAll("drill_sessions"))[0];
    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "987654321" } });
    view.rerender(content());
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "fr" } });
    await waitFor(() => expect(document.documentElement.lang).toBe("fr"));
    expect(screen.getByTestId("active-answer-panel").querySelector("input")).toHaveValue("987654321");
    const sessions = await storage.getAll("drill_sessions");
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(original.id);
    expect(sessions[0].startedAt).toBe(original.startedAt);
    expect(sessions[0].responses).toHaveLength(0);
  });

  it("retains the saved summary and starts no new benchmark when language changes", async () => {
    const storage = new MemoryAppStorage();
    render(
      <I18nProvider>
        <LanguageSelect />
        <QuestionPackBenchmarkSession benchmarkId={benchmark.id} builtInBenchmarks={[benchmark]} storageFactory={() => storage} />
      </I18nProvider>
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Skip" })).toBeEnabled());
    for (const question of benchmark.questions) {
      fireEvent.change(screen.getByLabelText("Answer"), { target: { value: String(question.answer.value) } });
      fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    }
    expect(await screen.findByText("Session saved on this device.")).toBeInTheDocument();
    const saved = await storage.getAll("drill_sessions");
    expect(saved).toHaveLength(1);
    expect(saved[0].responses).toHaveLength(2);
    expect(saved[0].score).toBeDefined();
    await act(async () => fireEvent.change(screen.getByLabelText("Language"), { target: { value: "fr" } }));
    await waitFor(() => expect(document.documentElement.lang).toBe("fr"));
    expect(screen.queryByTestId("active-answer-panel")).not.toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(await storage.getAll("drill_sessions")).toEqual(saved);
    expect(await storage.getAll("benchmark_results")).toHaveLength(1);
  });

  it("starts a fresh session when its timing identity changes", async () => {
    const storage = new MemoryAppStorage();
    const storageFactory = () => storage;
    const view = render(<QuestionPackBenchmarkSession benchmarkId={benchmark.id} builtInBenchmarks={[benchmark]} storageFactory={storageFactory} />);
    await waitFor(() => expect(screen.getByLabelText("Answer")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: "987654321" } });
    view.rerender(<QuestionPackBenchmarkSession benchmarkId={benchmark.id} builtInBenchmarks={[benchmark]} storageFactory={storageFactory} timingAccommodation="double_time" />);
    await waitFor(() => expect(screen.getByLabelText("Answer")).toBeEnabled());
    expect(screen.getByLabelText("Answer")).toHaveValue("");
    expect(screen.getByTestId("active-timing-accommodation")).toHaveTextContent("Double time");
    expect(await storage.getAll("drill_sessions")).toHaveLength(2);
  });
});
