import { describe, expect, it } from "vitest";

import { questioningPrompts } from "@/data/casePractice/questioningPrompts";
import {
  analyzeCaseQuestioningReferences,
  isCompleteCaseQuestion,
  scoreCaseQuestioning,
  type CaseQuestioningPrompt
} from "@/features/case-practice/questioning/questioningScoring";

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
  it("does not award rubric credit to isolated concept aliases", () => {
    const auditedPrompt = questioningPrompts[0];
    const score = scoreCaseQuestioning(auditedPrompt, {
      includeRanking: false,
      questions: [
        { id: "q1", text: "price" },
        { id: "q2", text: "ingredients" },
        { id: "q3", text: "shipping" }
      ]
    });

    expect(score.coverage.score).toBe(0);
    expect(score.relevance.score).toBe(0);
    expect(score.relevance.recognizedQuestionIds).toEqual([]);
    expect(score.totalScore).toBe(10);
    expect(score.maxScore).toBe(85);
    expect(score.totalScore / score.maxScore).toBeLessThan(0.8);
  });

  it("requires question structure and content beyond a copied alias list", () => {
    const score = scoreCaseQuestioning(prompt, {
      includeRanking: false,
      questions: [
        { id: "q1", text: "revenue, price, volume" },
        { id: "q2", text: "Which costs increased?" },
        { id: "q3", text: "Which region is affected?" }
      ]
    });

    expect(score.matches[0]?.intentId).toBeUndefined();
    expect(score.matches[0]?.matchedConceptIds).toEqual(["revenue", "price", "volume"]);
    expect(score.relevance.unrecognizedQuestionIds).toContain("q1");
    expect(isCompleteCaseQuestion("price", "en")).toBe(false);
    expect(isCompleteCaseQuestion("¿Cambiaron los precios por región?", "es")).toBe(true);
    expect(isCompleteCaseQuestion("هل تغيرت تكاليف الشحن؟", "ar")).toBe(true);
    expect(isCompleteCaseQuestion("价格是否因地区而变化？", "zh-Hans")).toBe(true);
    expect(isCompleteCaseQuestion("価格は地域によって変化しましたか？", "ja")).toBe(true);
    expect(isCompleteCaseQuestion("क्या क्षेत्र के अनुसार कीमत बदली?", "hi")).toBe(true);
    expect(isCompleteCaseQuestion("?!", "en")).toBe(false);
  });

  it("accepts the 300-character boundary and rejects longer direct submissions", () => {
    const exactBoundary = `${"Did sales change because of price or volume? "}${"evidence ".repeat(40)}`.slice(0, 300);
    const submission = {
      includeRanking: false,
      questions: [
        { id: "q1", text: exactBoundary },
        { id: "q2", text: "Which costs increased?" },
        { id: "q3", text: "Which region is affected?" }
      ]
    } as const;

    expect(exactBoundary).toHaveLength(300);
    expect(scoreCaseQuestioning(prompt, submission).matches[0]?.intentId).toBe("revenue_drivers");
    expect(() => scoreCaseQuestioning(prompt, {
      ...submission,
      questions: [{ id: "q1", text: `${exactBoundary}x` }, ...submission.questions.slice(1)]
    })).toThrow("300 characters or fewer");
  });

  it("flags references that rely only on normalized-away question words", () => {
    const timingPrompt: CaseQuestioningPrompt = {
      ...prompt,
      concepts: [{ id: "timing", label: "Timing", aliases: ["when", "timing", "cohort", "tenure"] }],
      intents: [{
        feedback: "Locate the change in time.",
        id: "timing",
        label: "Timing",
        priority: true,
        referenceQuestions: ["When did churn rise?", "How does churn vary by cohort or tenure?"],
        requiredConceptGroups: [["timing"]],
        weight: 1
      }]
    };

    expect(analyzeCaseQuestioningReferences(timingPrompt)).toEqual([{
      intentId: "timing",
      intentIndex: 0,
      matchedConceptIds: [],
      referenceIndex: 0
    }]);
  });

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

  it("keeps prepared scoring and reference review byte-for-byte deterministic per call", () => {
    const submission = {
      includeRanking: false,
      questions: [
        { id: "q1", text: "Did sales change because of price or volume?" },
        { id: "q2", text: "Which costs increased?" },
        { id: "q3", text: "Which region is affected?" }
      ]
    } as const;
    const promptBefore = JSON.stringify(prompt);
    const firstScore = JSON.stringify(scoreCaseQuestioning(prompt, submission));
    const firstReview = JSON.stringify(analyzeCaseQuestioningReferences(prompt));

    expect(JSON.stringify(scoreCaseQuestioning(prompt, submission))).toBe(firstScore);
    expect(JSON.stringify(analyzeCaseQuestioningReferences(prompt))).toBe(firstReview);
    expect(JSON.stringify(prompt)).toBe(promptBefore);
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

  it("keeps the earlier multilingual paraphrase as the canonical question", () => {
    const multilingualPrompt: CaseQuestioningPrompt = {
      concepts: [
        { id: "decline", label: "Caída", aliases: ["caída", "caidas", "decline"] },
        { id: "region", label: "Región", aliases: ["región", "regiones", "region"] },
        { id: "format", label: "Tipo de película", aliases: ["tipo de película", "tipos de peliculas", "film type"] },
        { id: "cost", label: "Costos", aliases: ["costo", "costos", "cost"] }
      ],
      id: "multilingual_scope",
      industry: "Entretenimiento",
      intents: [
        {
          feedback: "Ubique la caída por región y tipo de película.",
          id: "scope_decline",
          label: "Alcance de la caída",
          priority: true,
          referenceQuestions: ["¿La caída está concentrada en ciertas regiones o tipos de película?"],
          requiredConceptGroups: [["decline"], ["region"], ["format"]],
          supportingConceptIds: ["region", "format"],
          weight: 60
        },
        {
          feedback: "Aclare los costos.",
          id: "cost_driver",
          label: "Costos",
          priority: false,
          referenceQuestions: ["¿Qué costos aumentaron?"],
          requiredConceptGroups: [["cost"]],
          weight: 40
        }
      ],
      language: "es",
      maximumQuestions: 5,
      minimumQuestions: 3,
      mode: "diagnostic",
      objective: "Diagnosticar una caída de audiencia.",
      situation: "La audiencia bajó.",
      title: "Caída de audiencia"
    };
    const score = scoreCaseQuestioning(multilingualPrompt, {
      includeRanking: false,
      questions: [
        { id: "q1", text: "¿La caída está concentrada en ciertas regiones o tipos de película?" },
        { id: "q2", text: "En qué regiones o tipos de peliculas se concentra el problema?" },
        { id: "q3", text: "¿Qué costos aumentaron?" }
      ]
    });

    expect(score.matches[1]).toMatchObject({
      duplicateOfQuestionId: "q1",
      intentId: "scope_decline"
    });
    expect(score.distinctness.duplicateQuestionIds).toEqual(["q2"]);
  });

  it("normalizes diacritics and ordinary singular/plural variants conservatively", () => {
    const score = scoreCaseQuestioning(prompt, {
      includeRanking: false,
      questions: [
        { id: "q1", text: "Which cost increased in the region?" },
        { id: "q2", text: "Which costs increased in the région?" },
        { id: "q3", text: "Did sales change because of price or volume?" }
      ]
    });

    expect(score.matches[1]?.duplicateOfQuestionId).toBe("q1");
  });

  it("keeps substantively distinct questions under one intent separate", () => {
    const score = scoreCaseQuestioning(prompt, {
      includeRanking: false,
      questions: [
        { id: "q1", text: "Have prices changed?" },
        { id: "q2", text: "Did customer volume change?" },
        { id: "q3", text: "Which costs increased?" }
      ]
    });

    expect(score.matches[0]?.intentId).toBe("revenue_drivers");
    expect(score.matches[1]?.intentId).toBe("revenue_drivers");
    expect(score.distinctness.duplicateQuestionIds).toEqual([]);
  });

  it("does not collapse distinct cost drivers with similar wording", () => {
    const score = scoreCaseQuestioning(prompt, {
      includeRanking: false,
      questions: [
        { id: "q1", text: "Which fixed costs increased?" },
        { id: "q2", text: "Which variable costs decreased?" },
        { id: "q3", text: "Which region is affected?" }
      ]
    });

    expect(score.matches[0]?.intentId).toBe("cost_drivers");
    expect(score.matches[1]?.intentId).toBe("cost_drivers");
    expect(score.distinctness.duplicateQuestionIds).toEqual([]);
  });

  it("keeps acquisition and retention cost questions distinct", () => {
    const score = scoreCaseQuestioning(prompt, {
      includeRanking: false,
      questions: [
        { id: "q1", text: "What is customer acquisition cost?" },
        { id: "q2", text: "What is customer retention cost?" },
        { id: "q3", text: "Which region is affected?" }
      ]
    });

    expect(score.matches[0]?.intentId).toBe("cost_drivers");
    expect(score.matches[1]?.intentId).toBe("cost_drivers");
    expect(score.distinctness.duplicateQuestionIds).toEqual([]);
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
