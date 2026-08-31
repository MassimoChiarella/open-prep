import { describe, expect, it } from "vitest";

import { structuringPrompts } from "@/data/casePractice/structuringPrompts";
import { scoreCaseStructure } from "@/features/case-practice/structuring/structuringScoring";

const groceryPrompt = structuringPrompts[0];

describe("case structuring scoring", () => {
  it.each(structuringPrompts)("awards full credit for the model structure in $title", (prompt) => {
    const result = scoreCaseStructure(prompt, {
      hypothesisId: prompt.acceptedHypothesisId,
      branchIds: prompt.modelStructure.map((branch) => branch.branchId)
    });

    expect(result).toMatchObject({
      totalScore: 100,
      maxScore: 100,
      hypothesisPoints: 35,
      branchPoints: 65,
      hypothesisAccepted: true,
      missedBranchIds: [],
      extraBranchIds: []
    });
  });

  it("scores partial coverage and lower-priority branches deterministically", () => {
    const result = scoreCaseStructure(groceryPrompt, {
      hypothesisId: groceryPrompt.acceptedHypothesisId,
      branchIds: ["sales_mix", "gross_margin", "store_operations", "loyalty_launch"]
    });

    expect(result).toMatchObject({
      totalScore: 76,
      hypothesisPoints: 35,
      branchPoints: 41,
      matchedBranchIds: ["sales_mix", "gross_margin", "store_operations"],
      missedBranchIds: ["market_context"],
      extraBranchIds: ["loyalty_launch"]
    });
    expect(result.feedback).toContain("Add: Market and competitive context.");
    expect(result.feedback).toContain("Deprioritize: Design a new loyalty program.");
  });

  it("does not award hypothesis points for a weaker starting proposition", () => {
    const result = scoreCaseStructure(groceryPrompt, {
      hypothesisId: "temporary_weather",
      branchIds: ["sales_mix", "gross_margin"]
    });

    expect(result.totalScore).toBe(33);
    expect(result.hypothesisPoints).toBe(0);
    expect(result.hypothesisAccepted).toBe(false);
    expect(result.feedback[0]).toContain("A stronger starting hypothesis is");
  });

  it("awards hypothesis points for every explicitly accepted alternative", () => {
    const alternate = groceryPrompt.hypotheses.find(
      (hypothesis) => hypothesis.id !== groceryPrompt.acceptedHypothesisId
    );
    if (alternate === undefined) throw new Error("Expected an alternate hypothesis.");
    const prompt = {
      ...groceryPrompt,
      acceptedHypothesisIds: [groceryPrompt.acceptedHypothesisId, alternate.id]
    };
    const result = scoreCaseStructure(prompt, {
      hypothesisId: alternate.id,
      branchIds: prompt.modelStructure.map((branch) => branch.branchId)
    });

    expect(result).toMatchObject({
      totalScore: 100,
      hypothesisPoints: 35,
      hypothesisAccepted: true
    });
  });

  it("preserves legacy feedback and names alternatives without implying only one is valid", () => {
    const alternate = groceryPrompt.hypotheses.find(
      (hypothesis) => hypothesis.id !== groceryPrompt.acceptedHypothesisId
    );
    if (alternate === undefined) throw new Error("Expected an alternate hypothesis.");
    const submission = { hypothesisId: "store_growth_only", branchIds: ["sales_mix"] };

    expect(scoreCaseStructure({ ...groceryPrompt, acceptedHypothesisIds: undefined }, submission)).toEqual(
      scoreCaseStructure(groceryPrompt, submission)
    );
    expect(scoreCaseStructure({
      ...groceryPrompt,
      acceptedHypothesisIds: [groceryPrompt.acceptedHypothesisId, alternate.id]
    }, submission).feedback[0]).toContain(`Other accepted alternatives: ${alternate.label}.`);
  });

  it("deduplicates repeated branches and rejects submissions beyond the prompt limit", () => {
    const repeated = scoreCaseStructure(groceryPrompt, {
      hypothesisId: groceryPrompt.acceptedHypothesisId,
      branchIds: ["sales_mix", "sales_mix"]
    });

    expect(repeated.matchedBranchIds).toEqual(["sales_mix"]);
    expect(repeated.totalScore).toBe(51);
    expect(() =>
      scoreCaseStructure(groceryPrompt, {
        hypothesisId: groceryPrompt.acceptedHypothesisId,
        branchIds: groceryPrompt.branchOptions.slice(0, 5).map((branch) => branch.id)
      })
    ).toThrowError("Select no more than 4 issue-tree branches.");
  });
});

describe("structuring prompt catalog", () => {
  it("provides complete, selectable model structures for at least three cases", () => {
    expect(structuringPrompts.length).toBeGreaterThanOrEqual(3);

    for (const prompt of structuringPrompts) {
      const hypothesisIds = prompt.hypotheses.map((hypothesis) => hypothesis.id);
      const optionIds = prompt.branchOptions.map((branch) => branch.id);
      const modelBranchIds = prompt.modelStructure.map((branch) => branch.branchId);

      expect(hypothesisIds).toContain(prompt.acceptedHypothesisId);
      expect(new Set(optionIds).size).toBe(optionIds.length);
      expect(modelBranchIds.every((id) => optionIds.includes(id))).toBe(true);
      expect(modelBranchIds.length).toBeLessThanOrEqual(prompt.maxBranches);
    }
  });
});
