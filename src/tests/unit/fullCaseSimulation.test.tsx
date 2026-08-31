import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { brightCartFullCase } from "@/data/casePractice/fullCaseSimulations";
import { FullCaseSimulation } from "@/features/case-practice/simulation/FullCaseSimulation";
import type { FullCaseSimulationSpec } from "@/features/case-practice/simulation/fullCaseTypes";

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn()
  });
});

describe("FullCaseSimulation", () => {
  it("moves focus from questioning to the structure stage heading", async () => {
    render(<FullCaseSimulation />);

    for (const input of screen.getAllByPlaceholderText("Type a question you would ask the interviewer")) {
      fireEvent.change(input, { target: { value: "What business evidence should we test?" } });
    }
    fireEvent.click(screen.getByRole("button", { name: "Continue to Structure" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Open the case" })).toHaveFocus();
    });
  });

  it("renders the authored chart and labels the calculation with its answer unit", async () => {
    const situation = "S".repeat(2_000);
    const calculationPrompt = "Q".repeat(2_000);
    const simulation: FullCaseSimulationSpec = {
      ...brightCartFullCase,
      questioning: undefined,
      situation,
      exhibit: {
        ...brightCartFullCase.exhibit,
        visualization: {
          type: "bar_chart",
          title: "Eligible orders by city",
          xColumnId: "city",
          yColumnIds: ["eligible_orders"]
        },
        questions: brightCartFullCase.exhibit.questions.map((question) =>
          question.id !== brightCartFullCase.calculationQuestionId || question.responseType === "multiple_choice"
            ? question
            : {
                ...question,
                answer: { ...question.answer, unit: "percentage" },
                prompt: calculationPrompt
              }
        )
      }
    };

    render(<FullCaseSimulation simulation={simulation} />);

    expect(screen.getByText(situation)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");

    fireEvent.click(screen.getByRole("radio", { name: /BrightCart should expand first/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Customer demand/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to Exhibit and math" }));

    expect(await screen.findByTestId("exhibit-chart-brightcart_pilot_performance")).toBeInTheDocument();
    expect(screen.getByText(calculationPrompt)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    expect(screen.getByLabelText("Your answer (Percentage)")).toBeInTheDocument();
    expect(screen.queryByText("Use eligible orders x adoption x contribution per adopted order.")).not.toBeInTheDocument();
  });
});
