import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuestionPackDrillSessionLoader } from "@/features/question-packs/QuestionPackDrillSession";
import type { FixedNumericQuestionPackRecord } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("direct pack draft recovery", () => {
  it.each(["version", "reimport"])("does not resume obsolete questions after a pack %s change", async (change) => {
    const storage = new MemoryAppStorage();
    const pack: FixedNumericQuestionPackRecord = {
      id: "test-pack", title: "Test pack", format: "math-drill-question-pack", schemaVersion: 2,
      kind: "fixed_numeric", packVersion: "1", importedAt: "2026-09-07T12:00:00.000Z",
      questions: [{
        id: "question-1", type: "numeric", category: "arithmetic", tags: ["addition"], difficulty: "beginner",
        prompt: "What is 1 + 1?", answer: { value: 2 }, explanation: { short: "Two.", steps: ["One plus one is two."] }
      }]
    };
    await storage.put("question_packs", pack);
    const factory = () => storage;
    const view = render(<QuestionPackDrillSessionLoader difficulty="beginner" packId={pack.id} questionCount={1} storageFactory={factory} />);
    expect(await screen.findByTestId("active-question-prompt")).toHaveTextContent("What is 1 + 1?");
    await waitFor(async () => expect(await storage.count("drill_sessions")).toBe(1));
    view.unmount();
    await storage.put("question_packs", {
      ...pack,
      ...(change === "version" ? { packVersion: "2" } : { importedAt: "2026-09-07T13:00:00.000Z" }),
      questions: [{ ...pack.questions[0], prompt: "What is 3 + 3?", answer: { value: 6 } }]
    });
    render(<QuestionPackDrillSessionLoader difficulty="beginner" packId={pack.id} questionCount={1} storageFactory={factory} />);
    expect(await screen.findByTestId("active-question-prompt")).toHaveTextContent("What is 3 + 3?");
    await waitFor(async () => expect(await storage.count("drill_sessions")).toBe(2));
  });
});
