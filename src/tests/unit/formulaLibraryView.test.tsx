import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { coreFormulas } from "@/data/formulaLibrary/coreFormulas";
import { FormulaLibraryView } from "@/features/formulas/FormulaLibraryView";

describe("FormulaLibraryView", () => {
  it("shows clear search controls, active filters, result counts, and reset behavior", () => {
    render(<FormulaLibraryView formulas={coreFormulas} />);

    const panel = screen.getByTestId("formula-filter-panel");
    const activeFilters = screen.getByTestId("formula-active-filters");

    expect(within(panel).getByRole("heading", { name: "Find a Formula" })).toBeInTheDocument();
    expect(within(panel).getByText(`Showing ${coreFormulas.length} of ${coreFormulas.length} local formulas.`)).toBeInTheDocument();
    expect(within(activeFilters).getByText("Category: All formulas")).toBeInTheDocument();
    expect(within(activeFilters).getByText("Search: Any keyword")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Formula category"), {
      target: { value: "weighted_averages" }
    });

    expect(within(activeFilters).getByText("Category: Weighted averages")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Weighted Average" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Revenue" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search formulas"), {
      target: { value: "missing formula" }
    });

    expect(within(activeFilters).getByText("Search: missing formula")).toBeInTheDocument();
    const noResults = screen.getByTestId("formula-no-results");

    expect(within(noResults).getByRole("heading", { name: "No formulas match the current filters." })).toBeInTheDocument();
    expect(within(noResults).getByText("Clear the filters to return to all formulas, or start a drill if you already know what you want to practice.")).toBeInTheDocument();
    expect(within(noResults).getByRole("link", { name: "Start Drill" })).toHaveAttribute("href", "/drills");

    fireEvent.click(within(noResults).getByRole("button", { name: "Reset Formula Filters" }));

    expect(screen.getByLabelText("Search formulas")).toHaveValue("");
    expect(screen.getByLabelText("Formula category")).toHaveValue("all");
    expect(within(activeFilters).getByText("Category: All formulas")).toBeInTheDocument();
    expect(within(activeFilters).getByText("Search: Any keyword")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Revenue" })).toBeInTheDocument();
    expect(screen.queryByTestId("formula-no-results")).not.toBeInTheDocument();
  });

  it("groups formula cards by business task and labels math type", () => {
    render(<FormulaLibraryView formulas={coreFormulas} />);

    const groups = screen.getByTestId("formula-groups");

    expect(within(groups).getByRole("heading", { name: "Revenue And Profitability" })).toBeInTheDocument();
    expect(within(groups).getByRole("heading", { name: "Cost And Breakeven" })).toBeInTheDocument();
    expect(within(groups).getByRole("heading", { name: "Returns And Investment" })).toBeInTheDocument();
    expect(within(groups).getByRole("heading", { name: "Percent And Growth" })).toBeInTheDocument();
    expect(within(groups).getByRole("heading", { name: "Averages And Operations" })).toBeInTheDocument();

    const revenueGroup = screen.getByTestId("formula-group-core_business_model");

    expect(within(revenueGroup).getByRole("heading", { name: "Revenue" })).toBeInTheDocument();
    expect(within(revenueGroup).getByText("Multiplication")).toBeInTheDocument();
    expect(within(revenueGroup).getByRole("heading", { name: "Market Share" })).toBeInTheDocument();
    expect(within(revenueGroup).getByText("Share ratio")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Formula category"), {
      target: { value: "growth_compounding" }
    });

    expect(screen.getByTestId("formula-group-percent_growth")).toBeInTheDocument();
    expect(screen.queryByTestId("formula-group-core_business_model")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "CAGR" })).toBeInTheDocument();
    expect(screen.getByText("Compound growth")).toBeInTheDocument();
  });

  it("lays out formula cards with labeled formula, explanation, example, skills, and action areas", () => {
    render(<FormulaLibraryView formulas={coreFormulas} />);

    const revenueCard = screen.getByTestId("formula-card-revenue");

    expect(within(revenueCard).getByRole("heading", { name: "Revenue" })).toBeInTheDocument();
    expect(within(revenueCard).getByText("Formula")).toBeInTheDocument();
    expect(within(revenueCard).getByText("Revenue = Price x Volume")).toBeInTheDocument();
    expect(within(revenueCard).getByText("How to use it")).toBeInTheDocument();
    expect(within(revenueCard).getByText("Revenue is the total sales value created by selling a number of units at a given price.")).toBeInTheDocument();
    expect(within(revenueCard).getByText("Example")).toBeInTheDocument();
    expect(within(revenueCard).getByText("Selling 12,000 units at $25 each creates $300,000 in revenue.")).toBeInTheDocument();
    expect(within(revenueCard).getByText("revenue")).toBeInTheDocument();
    expect(
      within(revenueCard).getByText("Practice this formula with a short built-in drill using related question templates.")
    ).toBeInTheDocument();
    expect(within(revenueCard).getByRole("link", { name: "Start Related Drill" })).toHaveAttribute(
      "href",
      expect.stringContaining("categories=business_math")
    );
  });
});
