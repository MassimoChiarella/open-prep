import { describe, expect, it } from "vitest";

import { brainstormingPrompts } from "@/data/casePractice/brainstormingPrompts";
import {
  scoreBrainstorming,
  type BrainstormingPrompt
} from "@/features/case-practice/brainstorming/brainstormingScoring";
import { serializeQuestionPack, validateQuestionPackPayload } from "@/features/question-packs/questionPack";

const prompt: BrainstormingPrompt = {
  id: "test-prompt",
  title: "Test prompt",
  context: "Test context",
  question: "Test question",
  selectionLimit: 4,
  priorityLimit: 2,
  priorityIdeaIds: ["a1", "b1"],
  themes: [
    {
      id: "a",
      label: "Theme A",
      ideas: [
        { id: "a1", label: "A1", relevant: true },
        { id: "a2", label: "A2", relevant: true },
        { id: "a3", label: "A3", relevant: false }
      ]
    },
    {
      id: "b",
      label: "Theme B",
      ideas: [
        { id: "b1", label: "B1", relevant: true },
        { id: "b2", label: "B2", relevant: true },
        { id: "b3", label: "B3", relevant: false }
      ]
    }
  ]
};

describe("scoreBrainstorming", () => {
  it.each([1, 2])("makes full coverage attainable with %s distractor-only themes in installed packs", (count) => {
    const extendedPrompt = {
      ...prompt,
      themes: [...prompt.themes, ...Array.from({ length: count }, (_, index) => ({
        id: `distractor-${index}`, label: `Distractor theme ${index}`,
        ideas: [
          { id: `distractor-idea-${index}`, label: `Distractor ${index}`, relevant: false },
          { id: `other-distractor-${index}`, label: `Other distractor ${index}`, relevant: false }
        ]
      }))]
    };
    const result = validateQuestionPackPayload({
      format: "math-drill-question-pack", schemaVersion: 2, kind: "case_practice",
      id: "reachable-coverage", packVersion: "1.0", title: "Reachable coverage",
      brainstormingPrompts: [extendedPrompt]
    });
    if (result.status === "invalid") throw new Error(result.errors.join("\n"));
    if (result.pack.kind !== "case_practice") throw new Error("Expected a valid brainstorming pack.");
    const restored = validateQuestionPackPayload(JSON.parse(serializeQuestionPack(result.pack)));
    if (restored.status === "invalid" || restored.pack.kind !== "case_practice") throw new Error("Expected a valid restored pack.");
    for (const installedPrompt of [extendedPrompt, result.pack.brainstormingPrompts![0], restored.pack.brainstormingPrompts![0]]) {
      const correct = { selectedIdeaIds: ["a1", "a2", "b1", "b2"], priorityIdeaIds: ["a1", "b1"] };
      expect(scoreBrainstorming(installedPrompt, correct)).toMatchObject({
        totalScore: 10, maxScore: 10, coverage: { score: 3, coveredThemeIds: ["a", "b"] }
      });
      expect(scoreBrainstorming(installedPrompt, {
        ...correct, selectedIdeaIds: ["a1", "a2", "b1", "distractor-idea-0"]
      })).toMatchObject({ totalScore: 8, coverage: { score: 3 }, relevance: { score: 2, irrelevantIdeaIds: ["distractor-idea-0"] } });
      expect(scoreBrainstorming(installedPrompt, {
        selectedIdeaIds: ["a1", "a1", "unknown"], priorityIdeaIds: ["a1", "a1"]
      }).totalScore).toBe(5);
    }
  });

  it("awards full marks for broad, relevant choices with the expected priorities", () => {
    const score = scoreBrainstorming(prompt, {
      selectedIdeaIds: ["a1", "a2", "b1", "b2"],
      priorityIdeaIds: ["a1", "b1"]
    });

    expect(score).toMatchObject({
      totalScore: 10,
      maxScore: 10,
      coverage: { score: 3, coveredThemeIds: ["a", "b"] },
      relevance: { score: 4, irrelevantIdeaIds: [] },
      prioritization: { score: 3, matchedIdeaIds: ["a1", "b1"] }
    });
  });

  it("scores coverage separately and penalizes off-brief selections and priorities", () => {
    const score = scoreBrainstorming(prompt, {
      selectedIdeaIds: ["a1", "a2", "a3", "b3"],
      priorityIdeaIds: ["a1", "a3"]
    });

    expect(score.coverage).toMatchObject({ score: 2, coveredThemeIds: ["a"] });
    expect(score.relevance).toMatchObject({
      score: 0,
      relevantIdeaIds: ["a1", "a2"],
      irrelevantIdeaIds: ["a3", "b3"]
    });
    expect(score.prioritization).toMatchObject({
      score: 0,
      matchedIdeaIds: ["a1"],
      misplacedIdeaIds: ["a3"]
    });
  });

  it("ignores duplicate, unknown, and unselected priority IDs", () => {
    const score = scoreBrainstorming(prompt, {
      selectedIdeaIds: ["a1", "a1", "unknown"],
      priorityIdeaIds: ["a1", "a1", "b1", "unknown"]
    });

    expect(score.relevance.relevantIdeaIds).toEqual(["a1"]);
    expect(score.prioritization.matchedIdeaIds).toEqual(["a1"]);
    expect(score.totalScore).toBe(5);
  });

  it("does not score the optional note", () => {
    const submission = {
      selectedIdeaIds: ["a1", "a2", "b1", "b2"],
      priorityIdeaIds: ["a1", "b1"]
    };

    expect(scoreBrainstorming(prompt, { ...submission, note: "One explanation" })).toEqual(
      scoreBrainstorming(prompt, { ...submission, note: "A completely different explanation" })
    );
  });
});

describe("brainstormingPrompts", () => {
  it("provides complete original exercises with valid scoring keys", () => {
    expect(brainstormingPrompts).toHaveLength(3);

    for (const exercise of brainstormingPrompts) {
      const ideas = exercise.themes.flatMap((theme) => theme.ideas);
      const ideaIds = new Set(ideas.map((idea) => idea.id));

      expect(exercise.themes).toHaveLength(3);
      expect(ideas).toHaveLength(9);
      expect(new Set(exercise.priorityIdeaIds).size).toBe(exercise.priorityLimit);
      expect(exercise.priorityIdeaIds.every((id) => ideaIds.has(id))).toBe(true);
      expect(exercise.priorityIdeaIds.every((id) => ideas.find((idea) => idea.id === id)?.relevant)).toBe(true);
      const selectedIdeaIds = ideas.filter((idea) => idea.relevant).map((idea) => idea.id);
      expect(selectedIdeaIds).toHaveLength(exercise.selectionLimit);
      const score = scoreBrainstorming(exercise, { selectedIdeaIds, priorityIdeaIds: exercise.priorityIdeaIds });
      expect(score.totalScore).toBe(score.maxScore);
    }
  });
});
