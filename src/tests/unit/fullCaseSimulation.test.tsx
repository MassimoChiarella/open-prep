import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { brightCartFullCase } from "@/data/casePractice/fullCaseSimulations";
import { BrainstormingResponseFields } from "@/features/case-practice/brainstorming/BrainstormingDrill";
import { FullCaseSimulation } from "@/features/case-practice/simulation/FullCaseSimulation";
import type { FullCaseSimulationSpec } from "@/features/case-practice/simulation/fullCaseTypes";
import { SynthesisResponseFields } from "@/features/case-practice/synthesis/SynthesisPractice";

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn()
  });
});

describe("FullCaseSimulation", () => {
  it("isolates authored case and option text without overriding the surrounding RTL controls", () => {
    render(<div dir="rtl"><FullCaseSimulation simulation={{ ...brightCartFullCase, questioning: undefined }} /></div>);
    for (const text of [
      brightCartFullCase.client, brightCartFullCase.title, brightCartFullCase.situation,
      brightCartFullCase.structure.objective, brightCartFullCase.structure.hypotheses[0].label,
      brightCartFullCase.structure.branchOptions[0].label, brightCartFullCase.structure.branchOptions[0].description
    ]) expect(screen.getByText(text)).toHaveAttribute("dir", "auto");
    for (const element of [screen.getByRole("heading", { name: "Open the case" }), screen.getByRole("button", { name: "Continue to Exhibit and math" })]) {
      expect(element.closest("[dir]")).toHaveAttribute("dir", "rtl");
    }
  });

  it("isolates authored ideas and synthesis choices while retaining surrounding control direction", () => {
    const prompt = brightCartFullCase.brainstorming;
    render(<div dir="rtl">
      <BrainstormingResponseFields description={prompt.question} heading="Generate and prioritize actions" onIdeaChange={vi.fn()} onPriorityChange={vi.fn()} priorityIdeaIds={[]} prompt={prompt} selectedIdeaIds={[]} />
      <SynthesisResponseFields onChoose={vi.fn()} prompt={brightCartFullCase.synthesis} response={{}} />
    </div>);
    for (const text of [prompt.question, prompt.themes[0].label, prompt.themes[0].ideas[0].label, brightCartFullCase.synthesis.options.recommendation[0].label]) {
      expect(screen.getByText(text)).toHaveAttribute("dir", "auto");
    }
    expect(screen.getByRole("heading", { name: "Generate and prioritize actions" }).closest("[dir]")).toHaveAttribute("dir", "rtl");
    expect(screen.getAllByText("Priority")[0].closest("[dir]")).toHaveAttribute("dir", "rtl");
  });

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
    expect(screen.getByText(calculationPrompt)).toHaveAttribute("dir", "auto");
    expect(screen.getByLabelText("Your answer (Percentage)")).toBeInTheDocument();
    expect(screen.queryByText("Use eligible orders x adoption x contribution per adopted order.")).not.toBeInTheDocument();
  });
});
