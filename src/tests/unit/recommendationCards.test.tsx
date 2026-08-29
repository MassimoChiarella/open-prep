import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createDrillSettings } from "@/features/drills/drillSettings";
import { RecommendationCards } from "@/features/recommendations/RecommendationCards";
import type { Recommendation } from "@/lib/domain";

describe("RecommendationCards", () => {
  it("shows the recommendation signal and starts its configured drill", () => {
    const recommendation: Recommendation = {
      id: "magnitude",
      priority: "high",
      reason: "Magnitude errors need focused practice.",
      signal: { label: "Error signal", value: "4 magnitude errors" },
      suggestedSettings: createDrillSettings({
        categories: ["business_math"],
        feedbackMode: "retry_first",
        questionCount: 5,
        tags: ["revenue", "market_share"],
        timeMode: "untimed"
      }),
      title: "Practice magnitude control"
    };

    render(<RecommendationCards recommendations={[recommendation]} />);

    expect(screen.getByRole("heading", { name: recommendation.title })).toBeInTheDocument();
    expect(screen.getByText("Error signal: 4 magnitude errors")).toBeInTheDocument();
    expect(screen.getByText(recommendation.reason)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start Recommended Drill" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/drills\/session\?categories=business_math.*tags=revenue%2Cmarket_share/)
    );
  });

  it("offers a baseline drill when no signal is active", () => {
    render(<RecommendationCards recommendations={[]} />);

    expect(screen.getByRole("heading", { name: "Start with a baseline warm-up" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start Baseline Drill" })).toHaveAttribute(
      "href",
      expect.stringContaining("/drills/session?categories=arithmetic")
    );
  });
});
