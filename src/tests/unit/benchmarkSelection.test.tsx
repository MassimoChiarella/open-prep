import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { benchmarkTests } from "@/data/questionBank/benchmarkTests";
import {
  BenchmarkSelectionView,
  buildBenchmarkSelectionHref,
} from "@/features/benchmarks/BenchmarkSelectionView";
import { buildBenchmarkSessionHref } from "@/features/benchmarks/benchmarkSession";
import { I18nProvider } from "@/features/i18n/I18nProvider";
import { localePreferenceStorageKey } from "@/features/i18n/i18n";

describe("BenchmarkSelectionView", () => {
  it("localizes the benchmark decision surface", async () => {
    window.localStorage.setItem(localePreferenceStorageKey, "es");
    render(<I18nProvider><BenchmarkSelectionView benchmarks={benchmarkTests} /></I18nProvider>);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Evalúa tu rendimiento" })).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Elige una prueba" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Iniciar prueba" })).toBeInTheDocument();
    window.localStorage.removeItem(localePreferenceStorageKey);
  });

  it("presents every benchmark as a complete decision option", async () => {
    render(<BenchmarkSelectionView benchmarks={benchmarkTests} />);

    expect(
      screen.getByRole("heading", { name: "Benchmark your performance" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("benchmark-card-beginner")).toHaveClass("border-teal");
    expect(
      within(screen.getByTestId("benchmark-card-beginner")).getByText("Difficulty").closest("dl")
    ).toHaveClass("grid-cols-1", "min-[360px]:grid-cols-2");

    for (const benchmark of benchmarkTests) {
      const card = screen.getByTestId(`benchmark-card-${benchmark.id}`);

      expect(within(card).getByRole("heading", { name: benchmark.title })).toBeInTheDocument();
      expect(within(card).getByText("Difficulty")).toBeInTheDocument();
      expect(within(card).getByText("Time")).toBeInTheDocument();
      expect(within(card).getByText("Pace")).toBeInTheDocument();
      expect(within(card).getByText("Focus")).toBeInTheDocument();
      expect(within(card).getByText("Focus").closest("div")).toHaveClass("min-w-0");

      const link = within(card).getByRole("link");
      expect(link).toHaveAttribute("href", buildBenchmarkSelectionHref(benchmark.id));
    }

    expect(screen.queryByTestId("benchmark-comparison")).not.toBeInTheDocument();
    expect(screen.queryByTestId("benchmark-details")).not.toBeInTheDocument();

    const confirmation = screen.getByTestId("benchmark-confirmation");
    expect(within(confirmation).getByRole("heading", { name: "Ready to begin?" })).toBeInTheDocument();
    expect(within(confirmation).getByText(/Beginner Benchmark/)).toBeInTheDocument();
    expect(within(confirmation).getByRole("link", { name: "Begin Benchmark" })).toHaveAttribute(
      "href",
      buildBenchmarkSessionHref("beginner"),
    );

    const historyDisclosure = screen.getByTestId("benchmark-history-disclosure");
    expect(historyDisclosure).not.toHaveAttribute("open");
    expect(within(historyDisclosure).getByText("Saved benchmark history")).toBeInTheDocument();

    await screen.findByText("Benchmark history could not load.");
  });

  it("shows one concise start confirmation for the selected benchmark", async () => {
    render(<BenchmarkSelectionView benchmarks={benchmarkTests} selectedBenchmarkId="expert-pressure" />);

    const selectedCard = screen.getByTestId("benchmark-card-expert-pressure");
    expect(selectedCard).toHaveClass("border-teal");
    expect(
      within(selectedCard).getByRole("link", { name: "Expert Benchmark selected" }),
    ).toHaveAttribute("aria-current", "true");
    expect(within(selectedCard).getByText("Expert")).toBeInTheDocument();
    expect(within(selectedCard).getByText("10 min")).toBeInTheDocument();
    expect(within(selectedCard).getByText("30 sec/question")).toBeInTheDocument();
    expect(within(selectedCard).getByText("Business Math")).toBeInTheDocument();

    const confirmation = screen.getByTestId("benchmark-confirmation");
    expect(confirmation).toHaveTextContent("Expert Benchmark");
    expect(confirmation).toHaveTextContent("locked 10 min run with 20 questions");
    expect(confirmation).toHaveTextContent("Hints stay off");
    expect(within(confirmation).getByRole("link", { name: "Begin Benchmark" })).toHaveAttribute(
      "href",
      buildBenchmarkSessionHref("expert-pressure"),
    );

    await screen.findByText("Benchmark history could not load.");
  });

  it("keeps legacy confirmation links and question-pack routing deterministic", async () => {
    render(
      <BenchmarkSelectionView
        benchmarks={benchmarkTests}
        confirmBenchmarkId="expert-pressure"
        questionPackId="pack-one"
        selectedBenchmarkId="expert-pressure"
      />,
    );

    expect(screen.getAllByTestId("benchmark-confirmation")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Begin Benchmark" })).toHaveAttribute(
      "href",
      buildBenchmarkSessionHref("expert-pressure", "pack-one"),
    );
    expect(buildBenchmarkSelectionHref("expert-pressure", "pack-one")).toBe(
      "/benchmark?benchmark=expert-pressure&pack=pack-one",
    );
    await screen.findByText("Benchmark history could not load.");
  });
});
