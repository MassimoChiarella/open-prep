import { describe, expect, it } from "vitest";

import { brainstormingPrompts } from "@/data/casePractice/brainstormingPrompts";
import {
  scoreBrainstorming,
  type BrainstormingPrompt
} from "@/features/case-practice/brainstorming/brainstormingScoring";

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
    }
  });
});
