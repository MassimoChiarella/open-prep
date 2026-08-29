import { describe, expect, it } from "vitest";

import { scoreCaseQuestioning, type CaseQuestioningPrompt } from "@/features/case-practice/questioning/questioningScoring";

const prompt: CaseQuestioningPrompt = {
  concepts: [
    { id: "revenue", label: "Revenue", aliases: ["revenue", "sales", "top line"] },
    { id: "price", label: "Price", aliases: ["price", "pricing"] },
    { id: "volume", label: "Volume", aliases: ["volume", "customers", "units sold"] },
    { id: "cost", label: "Costs", aliases: ["cost", "costs", "expenses", "spending"] },
    { id: "scope", label: "Scope", aliases: ["region", "product", "channel", "segment"] }
  ],
  id: "profitability_questions",
  industry: "Retail",
  intents: [
    {
      feedback: "Separate revenue into price and volume.",
      id: "revenue_drivers",
      label: "Revenue drivers",
      priority: true,
      referenceQuestions: ["Did revenue change because of price, customer volume, or product mix?"],
      requiredConceptGroups: [["revenue"], ["price", "volume"]],
      supportingConceptIds: ["price", "volume"],
      weight: 40
    },
    {
      feedback: "Identify which expenses changed.",
      id: "cost_drivers",
      label: "Cost drivers",
      priority: true,
      referenceQuestions: ["Which costs or expenses increased?"],
      requiredConceptGroups: [["cost"]],
      weight: 35
    },
    {
      feedback: "Determine where the decline is concentrated.",
      id: "scope",
      label: "Scope and segmentation",
      priority: false,
      referenceQuestions: ["Is the decline concentrated in a region, product, or channel?"],
      requiredConceptGroups: [["scope"]],
      weight: 25
    }
  ],
  language: "en",
  maximumQuestions: 6,
  minimumQuestions: 3,
  mode: "diagnostic",
  objective: "Identify why profit declined.",
  situation: "A retailer's profit fell.",
  title: "Retail profit decline"
};

describe("case questioning scoring", () => {
  it("matches paraphrases through concepts, references, and typo-tolerant aliases", () => {
    const score = scoreCaseQuestioning(prompt, {
      includeRanking: false,
      questions: [
        { id: "q1", text: "WHAT’S happening to Révenue because of pricing or customer volume?!" },
        { id: "q2", text: "Which expnses have increased the most?" },
        { id: "q3", text: "Is the decline concentrated in a region or product?" }
      ]
    });

    expect(score.coverage.matchedIntentIds).toEqual(["revenue_drivers", "cost_drivers", "scope"]);
    expect(score.relevance.unrecognizedQuestionIds).toEqual([]);
    expect(score.distinctness.duplicateQuestionIds).toEqual([]);
    expect(score.totalScore).toBe(score.maxScore);
    expect(score.maxScore).toBe(85);
  });

  it("does not treat a generic question as semantically relevant", () => {
    const score = scoreCaseQuestioning(prompt, {
      includeRanking: false,
      questions: [
        { id: "q1", text: "Can you tell me more?" },
        { id: "q2", text: "Which costs increased?" },
        { id: "q3", text: "Which region is affected?" }
      ]
    });

    expect(score.relevance.unrecognizedQuestionIds).toContain("q1");
    expect(score.relevance.score).toBeLessThan(score.relevance.maxScore);
  });

  it("recognizes a strong authored supporting concept as a partial theme match", () => {
    const score = scoreCaseQuestioning(prompt, {
      includeRanking: false,
      questions: [
        { id: "q1", text: "Have prices changed over the last year?" },
        { id: "q2", text: "Which costs increased?" },
        { id: "q3", text: "Which region is affected?" }
      ]
    });

    expect(score.matches[0]).toMatchObject({
      conceptCoverage: 0.5,
      intentId: "revenue_drivers",
      matchedConceptIds: ["price"]
    });
    expect(score.matches[0]?.similarity).toBeLessThan(0.58);
    expect(score.relevance.unrecognizedQuestionIds).not.toContain("q1");
  });

  it("marks repeated questions without awarding duplicate coverage", () => {
    const score = scoreCaseQuestioning(prompt, {
      includeRanking: false,
      questions: [
        { id: "q1", text: "Did sales change because of pricing or volume?" },
        { id: "q2", text: "Did revenue change because of price or volume?" },
        { id: "q3", text: "Which costs increased?" }
      ]
    });

    expect(score.distinctness.duplicateQuestionIds).toEqual(["q2"]);
    expect(score.coverage.matchedIntentIds).toEqual(["revenue_drivers", "cost_drivers"]);
  });

  it("adds prioritization only when the learner enables ranking", () => {
    const unranked = scoreCaseQuestioning(prompt, {
      includeRanking: false,
      questions: [
        { id: "q1", text: "Which costs increased?" },
        { id: "q2", text: "Did sales change because of price or volume?" },
        { id: "q3", text: "Which region is affected?" }
      ]
    });
    const ranked = scoreCaseQuestioning(prompt, {
      includeRanking: true,
      questions: [
        { id: "q1", rank: 1, text: "Which costs increased?" },
        { id: "q2", rank: 2, text: "Did sales change because of price or volume?" },
        { id: "q3", rank: 3, text: "Which region is affected?" }
      ]
    });

    expect(unranked.prioritization).toBeUndefined();
    expect(unranked.maxScore).toBe(85);
    expect(ranked.prioritization?.score).toBe(15);
    expect(ranked.maxScore).toBe(100);
  });

  it("rejects incomplete or invalid ranked submissions", () => {
    expect(() => scoreCaseQuestioning(prompt, {
      includeRanking: true,
      questions: [
        { id: "q1", rank: 1, text: "Which costs increased?" },
        { id: "q2", rank: 1, text: "Did sales change because of price or volume?" },
        { id: "q3", rank: 3, text: "Which region is affected?" }
      ]
    })).toThrow("unique rank");
  });
});
