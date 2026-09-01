import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuestionPackPoolSettings } from "@/features/question-packs/QuestionPackPoolSettings";
import {
  questionPackPoolPreferenceStorageKey,
  serializeQuestionPackPoolPreference
} from "@/features/question-packs/questionPackPoolPreference";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("QuestionPackPoolSettings", () => {
  it("loads installed packs and saves an exclusive multi-pack selection", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("question_packs", questionPack("pack-a", "Pack A"));
    await storage.put("question_packs", questionPack("pack-b", "Pack B"));
    const preferences = new MemoryPreferenceStorage();

    render(
      <QuestionPackPoolSettings
        preferenceStorage={preferences}
        storageFactory={() => storage}
      />
    );

    fireEvent.click(screen.getByRole("radio", { name: /Selected packs only/ }));
    expect(screen.getByRole("button", { name: "Save Question Pool" })).toBeDisabled();
    expect(await screen.findByText(/Select at least one installed pack/)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("checkbox", { name: /Pack A/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Pack B/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save Question Pool" }));

    expect(await screen.findByText("Question pool saved on this device.")).toBeInTheDocument();
    expect(preferences.getItem(questionPackPoolPreferenceStorageKey)).toBe(
      serializeQuestionPackPoolPreference({
        mode: "selected_only",
        selectedPackIds: ["pack-a", "pack-b"]
      })
    );
  });

  it("removes unavailable IDs on save and requires an installed selection for exclusive mode", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("question_packs", questionPack("pack-a", "Pack A"));
    const preferences = new MemoryPreferenceStorage({
      [questionPackPoolPreferenceStorageKey]: serializeQuestionPackPoolPreference({
        mode: "selected_only",
        selectedPackIds: ["missing-pack"]
      })
    });

    render(
      <QuestionPackPoolSettings
        preferenceStorage={preferences}
        storageFactory={() => storage}
      />
    );

    expect(await screen.findByText(/1 selected pack IDs are not installed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Question Pool" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Pack A/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save Question Pool" }));

    await waitFor(() => expect(preferences.getItem(questionPackPoolPreferenceStorageKey)).toBe(
      serializeQuestionPackPoolPreference({
        mode: "selected_only",
        selectedPackIds: ["pack-a"]
      })
    ));
  });

  it("recovers when the stored selection is filled with unavailable pack IDs", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("question_packs", questionPack("pack-a", "Pack A"));
    const preferences = new MemoryPreferenceStorage({
      [questionPackPoolPreferenceStorageKey]: serializeQuestionPackPoolPreference({
        mode: "selected_only",
        selectedPackIds: Array.from({ length: 200 }, (_, index) => `missing-${index}`)
      })
    });

    render(
      <QuestionPackPoolSettings
        preferenceStorage={preferences}
        storageFactory={() => storage}
      />
    );

    fireEvent.click(await screen.findByRole("checkbox", { name: /Pack A/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save Question Pool" }));

    await waitFor(() => expect(preferences.getItem(questionPackPoolPreferenceStorageKey)).toBe(
      serializeQuestionPackPoolPreference({ mode: "selected_only", selectedPackIds: ["pack-a"] })
    ));
  });

  it("reports a preference write failure", async () => {
    const preferences = new MemoryPreferenceStorage({}, true);

    render(
      <QuestionPackPoolSettings
        preferenceStorage={preferences}
        storageFactory={() => new MemoryAppStorage()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Save Question Pool" }));
    expect(await screen.findByText("Question pool could not be saved on this device.")).toBeInTheDocument();
  });
});

class MemoryPreferenceStorage implements Pick<Storage, "getItem" | "setItem"> {
  private readonly values = new Map<string, string>();

  constructor(initial: Record<string, string> = {}, private readonly failWrites = false) {
    Object.entries(initial).forEach(([key, value]) => this.values.set(key, value));
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("blocked");
    this.values.set(key, value);
  }
}

function questionPack(id: string, title: string) {
  return {
    format: "math-drill-question-pack" as const,
    id,
    importedAt: `2026-08-31T12:00:0${id === "pack-a" ? "0" : "1"}.000Z`,
    kind: "fixed_numeric" as const,
    packVersion: "1.0.0",
    questions: [{
      answer: { value: 10 },
      category: "arithmetic" as const,
      difficulty: "beginner" as const,
      explanation: { short: "Add.", steps: ["Add the values."] },
      id: "addition-1",
      prompt: "What is 4 + 6?",
      tags: ["addition" as const],
      type: "numeric" as const
    }],
    schemaVersion: 2 as const,
    title
  };
}
