import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { buildDrillSettingsQuery } from "@/features/drills/drillSettingsOptions";
import { SessionSummaryView } from "@/features/drills/SessionSummaryView";
import type { SessionSummarySnapshot } from "@/features/drills/sessionSummary";
import { I18nProvider } from "@/features/i18n/I18nProvider";
import { localePreferenceStorageKey } from "@/features/i18n/i18n";
import "@/features/i18n/locales/es";

afterEach(() => window.localStorage.removeItem(localePreferenceStorageKey));

describe("SessionSummaryView", () => {
  it("localizes the core results handoff", async () => {
    window.localStorage.setItem(localePreferenceStorageKey, "es");
    render(<I18nProvider><SessionSummaryView snapshot={summarySnapshot()} /></I18nProvider>);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Resultados de la sesión" })).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Repetir ejercicio" })).toBeInTheDocument();
  });

  it("summarizes results, reviews misses, and repeats the same custom-pack drill", () => {
    const snapshot = summarySnapshot();

    render(<SessionSummaryView newBestLabels={["Arithmetic accuracy"]} snapshot={snapshot} />);

    expect(screen.getByRole("heading", { name: "Session Results" })).toBeInTheDocument();
    expect(screen.getByText("1 correct / 2 attempted")).toBeInTheDocument();
    expect(screen.getByTestId("session-summary-new-bests")).toHaveTextContent("Arithmetic accuracy");
    expect(screen.getByTestId("session-summary-score-panel")).toHaveTextContent("100 pts");
    expect(screen.getByTestId("session-summary-score-panel")).toHaveTextContent("50%");

    const review = screen.getByRole("heading", { name: "Question Review" }).parentElement;
    expect(review).not.toBeNull();
    expect(within(review as HTMLElement).getByText("Answer saved as correct.")).toBeInTheDocument();
    expect(within(review as HTMLElement).getByText("Answer saved for review after the final attempt.")).toBeInTheDocument();
    expect(within(review as HTMLElement).getByText("Errors: arithmetic error")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Repeat Drill" })).toHaveAttribute(
      "href",
      `/drills/session?${buildDrillSettingsQuery(snapshot.settings)}`
    );
  });

  it("labels the adjusted limit and suppresses standard bests for accommodated results", () => {
    const snapshot = summarySnapshot();
    snapshot.settings = {
      ...snapshot.settings,
      timeMode: "session",
      timingAccommodation: "time_and_a_half",
      totalSessionSeconds: 60
    };

    render(<SessionSummaryView newBestLabels={["Arithmetic accuracy"]} snapshot={snapshot} />);

    expect(screen.getByTestId("session-summary-timing")).toHaveTextContent("Time and a half");
    expect(screen.getByTestId("session-summary-timing")).toHaveTextContent(
      "The adjusted limit was 1m 30s; the standard limit was 1 min."
    );
    expect(screen.queryByTestId("session-summary-new-bests")).not.toBeInTheDocument();
    expect(new URL(
      screen.getByRole("link", { name: "Repeat Drill" }).getAttribute("href") ?? "",
      "http://localhost"
    ).searchParams.get("timingAccommodation")).toBe("time_and_a_half");
  });
});

function summarySnapshot(): SessionSummarySnapshot {
  return {
    endedAt: "2026-06-02T00:00:25.000Z",
    id: "summary-view-test",
    questionResults: [
      {
        category: "arithmetic",
        correctValue: 30,
        errorTypes: ["none"],
        explanation: {
          short: "Add the values.",
          steps: ["10 + 20 = 30."],
          shortcut: "Combine the tens."
        },
        isCorrect: true,
        prompt: "What is 10 + 20?",
        rawInput: "30",
        tags: ["addition"],
        timeTakenSeconds: 10
      },
      {
        category: "arithmetic",
        correctValue: 42,
        errorTypes: ["arithmetic_error"],
        explanation: { short: "Add the values.", steps: ["20 + 22 = 42."] },
        isCorrect: false,
        prompt: "What is 20 + 22?",
        rawInput: "41",
        tags: ["addition"],
        timeTakenSeconds: 15
      }
    ],
    score: {
      accuracy: 0.5,
      averageTimeSeconds: 12.5,
      categoryBreakdown: [
        {
          accuracy: 0.5,
          averageTimeSeconds: 12.5,
          category: "arithmetic",
          questionCount: 2
        }
      ],
      correctCount: 1,
      errorBreakdown: [{ count: 1, errorType: "arithmetic_error" }],
      incorrectCount: 1,
      totalScore: 100
    },
    settings: {
      categories: ["arithmetic"],
      difficulty: "intermediate",
      feedbackMode: "instant",
      questionCount: 2,
      questionPackId: "company-case-prep",
      timeMode: "untimed"
    },
    startedAt: "2026-06-02T00:00:00.000Z"
  };
}
