import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SessionGuidancePanel } from "@/features/drills/SessionGuidancePanel";

describe("SessionGuidancePanel", () => {
  it("shows the first three weakness rows with their supporting metrics", () => {
    render(
      <SessionGuidancePanel
        recommendationHref="/drills/session?categories=percentages"
        recommendationText="Practice percentages"
        weaknesses={[
          { accuracy: 0.5, averageTimeSeconds: 24.25, label: "Percentages", reason: "Accuracy is below target." },
          { accuracy: 0.6, averageTimeSeconds: 18, label: "Division", reason: "Answers are taking longer than target." },
          { accuracy: 0.75, averageTimeSeconds: 15.55, label: "Market sizing", reason: "Recent attempts need review." },
          { accuracy: 0.8, averageTimeSeconds: 12, label: "Arithmetic", reason: "This row should not be shown." }
        ]}
      />
    );

    const list = screen.getByRole("list");
    const rows = within(list).getAllByRole("listitem");

    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("Percentages")).toBeInTheDocument();
    expect(within(rows[0]).getByText("50%")).toBeInTheDocument();
    expect(within(rows[0]).getByText("24.3s")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Accuracy is below target.")).toBeInTheDocument();
    expect(screen.queryByText("Arithmetic")).not.toBeInTheDocument();
  });

  it("shows a clear empty state when no weaknesses are supplied", () => {
    render(
      <SessionGuidancePanel
        recommendationHref="/drills"
        recommendationText="Start a mixed drill"
        weaknesses={[]}
      />
    );

    expect(screen.getByRole("heading", { name: "Focus Areas" })).toBeInTheDocument();
    expect(screen.getByText("No focus areas were identified in this session.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders the supplied recommendation as the primary action", () => {
    render(
      <SessionGuidancePanel
        recommendationHref="/drills/session?categories=case_math"
        recommendationText="Start recommended case drill"
        weaknesses={[]}
      />
    );

    expect(screen.getByRole("link", { name: "Start recommended case drill" })).toHaveAttribute(
      "href",
      "/drills/session?categories=case_math"
    );
  });
});
