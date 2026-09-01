import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { marketSizingTemplates } from "@/data/marketSizing/marketSizingTemplates";
import { MarketSizingGuidedForm } from "@/features/market-sizing/MarketSizingGuidedForm";
import type { MarketSizingTemplate } from "@/features/market-sizing/marketSizingTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("MarketSizingGuidedForm", () => {
  it("offers alternate practice when prompts are unavailable", () => {
    render(<MarketSizingGuidedForm templates={[]} />);

    expect(screen.getByRole("heading", { name: "Market sizing prompts are unavailable." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start Drill" })).toHaveAttribute("href", "/drills");
    expect(screen.getByRole("link", { name: "Try Exhibits" })).toHaveAttribute("href", "/exhibits");
  });

  it("isolates source-language prompt content from the surrounding interface direction", () => {
    render(<MarketSizingGuidedForm templates={marketSizingTemplates} />);

    expect(screen.getByText(marketSizingTemplates[0].prompt)).toHaveAttribute("dir", "auto");
    expect(screen.getByText(marketSizingTemplates[0].description)).toHaveAttribute("dir", "auto");
    expect(screen.getAllByText(marketSizingTemplates[0].senseCheck.prompt)[0]).toHaveAttribute("dir", "auto");
  });

  it("uses whole-number controls and blocks fractional integer assumptions", () => {
    render(<MarketSizingGuidedForm templates={marketSizingTemplates} />);

    const population = screen.getByLabelText("Population");
    const cupsPerDay = screen.getByLabelText("Purchased cups per drinker per day");
    expect(population).toHaveAttribute("inputmode", "numeric");
    expect(population).toHaveAttribute("step", "1");
    expect(cupsPerDay).toHaveAttribute("inputmode", "decimal");
    expect(cupsPerDay).toHaveAttribute("step", "any");

    fireEvent.change(population, { target: { value: "3000000.5" } });
    fireEvent.change(screen.getByLabelText("Percent who buy prepared coffee"), { target: { value: "60%" } });
    fireEvent.change(cupsPerDay, { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Purchase days per year"), { target: { value: "365" } });
    fireEvent.change(screen.getByLabelText("Average price per cup"), { target: { value: "$4" } });
    fireEvent.click(screen.getByLabelText("Sense-check completed"));

    expect(screen.getByTestId("market-sizing-range-population")).toHaveTextContent("Enter a whole number.");
    expect(screen.getByRole("button", { name: "Continue to Calculation" })).toBeDisabled();
  });

  it("exposes the complete selected choice in an adjacent wrapping description", () => {
    const selectedLabel = "C".repeat(500);
    const choiceTemplate: MarketSizingTemplate = {
      ...marketSizingTemplates[0],
      inputSteps: [
        {
          id: "customer_segment",
          inputKind: "choice",
          label: "Customer segment",
          options: [{ id: "enterprise", label: selectedLabel }],
          required: false
        },
        ...marketSizingTemplates[0].inputSteps
      ]
    };

    render(<MarketSizingGuidedForm templates={[choiceTemplate]} />);

    const choice = screen.getByLabelText("Customer segment");
    expect(screen.queryByTestId("market-sizing-selected-choice-customer_segment")).not.toBeInTheDocument();

    fireEvent.change(choice, { target: { value: "enterprise" } });

    const selectedChoice = screen.getByTestId("market-sizing-selected-choice-customer_segment");
    expect(choice).toHaveValue("enterprise");
    expect(choice).toHaveAttribute("aria-describedby", selectedChoice.id);
    expect(selectedChoice).toHaveClass("min-w-0", "grid-cols-[minmax(0,1fr)]", "[overflow-wrap:anywhere]");
    expect(within(selectedChoice).getByText(selectedLabel)).toHaveAttribute("dir", "auto");

    fireEvent.change(choice, { target: { value: "" } });
    expect(choice).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByTestId("market-sizing-selected-choice-customer_segment")).not.toBeInTheDocument();
  });

  it("scores and persists a completed guided estimate", async () => {
    const storage = new MemoryAppStorage();

    render(<MarketSizingGuidedForm storageFactory={() => storage} templates={marketSizingTemplates} />);

    completeCoffeeAssumptions();
    fireEvent.click(screen.getByRole("button", { name: "Continue to Calculation" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to Final Answer" }));
    fireEvent.change(screen.getByLabelText("Final answer (Currency)"), { target: { value: "$2.628B" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    fireEvent.change(screen.getByLabelText("Interpretation"), { target: { value: "plausible" } });
    fireEvent.click(screen.getByRole("button", { name: "Score Draft" }));

    expect(await screen.findByText("Score 100/100 saved on this device.")).toBeInTheDocument();
    expect(storage.peekAll("market_sizing_attempts")).toEqual([
      expect.objectContaining({ score: 100, templateId: "market_coffee_city_001" })
    ]);
  });

  it("discloses shared-browser exposure beside notes without changing persistence", async () => {
    const storage = new MemoryAppStorage();

    render(<MarketSizingGuidedForm storageFactory={() => storage} templates={marketSizingTemplates} />);

    completeCoffeeAssumptions();
    fireEvent.click(screen.getByRole("button", { name: "Continue to Calculation" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to Final Answer" }));
    fireEvent.change(screen.getByLabelText("Final answer (Currency)"), { target: { value: "$2.628B" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));

    const note = screen.getByLabelText("Notes");
    const disclosureText = screen.getByText(
      "Saved self-review notes are browser-local, unencrypted, and visible to anyone with access to this browser profile."
    );
    const disclosure = disclosureText.closest("#market-sizing-note-shared-device-disclosure");
    if (!(disclosure instanceof HTMLElement)) throw new Error("Missing note disclosure container.");

    expect(note).toHaveAttribute("aria-describedby", "market-sizing-note-shared-device-disclosure");
    expect(note).toHaveAttribute("dir", "auto");
    expect(disclosure).toHaveClass("min-w-0", "grid-cols-[minmax(0,1fr)]", "[overflow-wrap:anywhere]");
    expect(within(disclosure).getByRole("link", { name: "Manage backups and clear saved data in Settings" }))
      .toHaveAttribute("href", "/settings");

    fireEvent.change(note, { target: { value: "Recheck the demand-side assumption." } });
    fireEvent.change(screen.getByLabelText("Interpretation"), { target: { value: "plausible" } });
    fireEvent.click(screen.getByRole("button", { name: "Score Draft" }));

    expect(await screen.findByText("Score 100/100 saved on this device.")).toBeInTheDocument();
    expect(storage.peekAll("market_sizing_attempts")).toEqual([
      expect.objectContaining({ note: "Recheck the demand-side assumption.", score: 100 })
    ]);
  });

  it("withholds the calculated result and answer evaluation until final-answer submission", () => {
    render(<MarketSizingGuidedForm templates={marketSizingTemplates} />);

    completeCoffeeAssumptions();
    fireEvent.click(screen.getByRole("button", { name: "Continue to Calculation" }));

    expect(screen.getByTestId("market-sizing-calculation-inputs")).toHaveTextContent("3,000,000");
    expect(screen.getByTestId("market-sizing-calculation-section")).toHaveTextContent(
      "population * coffeeDrinkerRate * cupsPerDay * purchaseDaysPerYear * pricePerCup"
    );
    expect(screen.queryByText("$2,628,000,000")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue to Final Answer" }));
    const answerInput = screen.getByLabelText("Final answer (Currency)");

    fireEvent.change(answerInput, { target: { value: "$1B" } });
    expect(screen.queryByTestId("market-sizing-final-answer-status")).not.toBeInTheDocument();
    expect(screen.queryByText("$2,628,000,000")).not.toBeInTheDocument();

    fireEvent.change(answerInput, { target: { value: "$2.628B" } });
    expect(screen.queryByText("Final answer matches the calculated result.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));

    expect(screen.getByTestId("market-sizing-review-result")).toHaveTextContent("$2,628,000,000");
    expect(screen.getByTestId("market-sizing-review-result")).toHaveTextContent(
      "Final answer matches the calculated result."
    );
  });

  it("associates invalid final-answer guidance without revealing correctness", () => {
    render(<MarketSizingGuidedForm templates={marketSizingTemplates} />);

    completeCoffeeAssumptions();
    fireEvent.click(screen.getByRole("button", { name: "Continue to Calculation" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to Final Answer" }));

    const answerInput = screen.getByLabelText("Final answer (Currency)");
    fireEvent.change(answerInput, { target: { value: "not a number" } });

    expect(answerInput).toHaveAttribute("aria-describedby", "market-sizing-final-answer-status");
    expect(screen.getByTestId("market-sizing-final-answer-status")).toHaveTextContent("Enter a valid number.");
    expect(screen.getByRole("button", { name: "Submit Answer" })).toBeDisabled();
  });

  it("shows formula failures and does not allow the draft to advance", () => {
    const unsafeTemplate = {
      ...marketSizingTemplates[0],
      finalFormula: { ...marketSizingTemplates[0].finalFormula, expression: "population / cupsPerDay" }
    };
    render(<MarketSizingGuidedForm templates={[unsafeTemplate]} />);

    completeCoffeeAssumptions("0");

    expect(screen.getByTestId("market-sizing-calculation-error")).toHaveTextContent(
      "Formula cannot divide by zero. Change the assumptions and try again."
    );
    expect(screen.getByRole("button", { name: "Continue to Calculation" })).toBeDisabled();
  });
});

function completeCoffeeAssumptions(cupsPerDay = "1"): void {
  fireEvent.change(screen.getByLabelText("Population"), { target: { value: "3000000" } });
  fireEvent.change(screen.getByLabelText("Percent who buy prepared coffee"), { target: { value: "60%" } });
  fireEvent.change(screen.getByLabelText("Purchased cups per drinker per day"), { target: { value: cupsPerDay } });
  fireEvent.change(screen.getByLabelText("Purchase days per year"), { target: { value: "365" } });
  fireEvent.change(screen.getByLabelText("Average price per cup"), { target: { value: "$4" } });
  fireEvent.click(screen.getByLabelText("Sense-check completed"));
}
