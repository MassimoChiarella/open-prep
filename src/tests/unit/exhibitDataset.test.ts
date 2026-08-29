import { describe, expect, it } from "vitest";

import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import {
  getExhibitDimensionColumnIds,
  getExhibitMetricColumnIds,
  toExhibitQuestion
} from "@/features/exhibits/exhibitDataset";

describe("exhibit dataset model", () => {
  it("maps a bundled dataset into the shared question model", () => {
    const dataset = exhibitDatasets[0];
    const question = toExhibitQuestion(dataset, dataset.questions[0]);

    expect(getExhibitDimensionColumnIds(dataset)).not.toHaveLength(0);
    expect(getExhibitMetricColumnIds(dataset)).not.toHaveLength(0);
    expect(question).toMatchObject({
      category: "exhibit_math",
      id: `${dataset.id}:${dataset.questions[0].id}`,
      metadata: {
        sourceType: "manual",
        variables: {
          exhibitId: dataset.id,
          exhibitQuestionId: dataset.questions[0].id
        }
      },
      type: "exhibit"
    });
  });
});
