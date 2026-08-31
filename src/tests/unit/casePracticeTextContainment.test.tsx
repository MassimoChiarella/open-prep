import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { brainstormingPrompts } from "@/data/casePractice/brainstormingPrompts";
import { conceptLessons } from "@/data/casePractice/conceptLessons";
import { structuringPrompts } from "@/data/casePractice/structuringPrompts";
import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { BrainstormingResponseFields } from "@/features/case-practice/brainstorming/BrainstormingDrill";
import { CasePracticeHub } from "@/features/case-practice/CasePracticeHub";
import { ConceptLessonsView } from "@/features/case-practice/lessons/ConceptLessonsView";
import { StructuringResponseFields } from "@/features/case-practice/structuring/StructuringPractice";
import { ExhibitTableRenderer } from "@/features/exhibits/ExhibitTableRenderer";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const unbroken = (character: string, length = 500) => character.repeat(length);

describe("case-practice imported-text containment", () => {
  it("contains structuring hypothesis, branch, and model copy", () => {
    const prompt = structuringPrompts[0];
    const hypothesisLabel = unbroken("H");
    const branchLabel = unbroken("B");
    const branchDescription = unbroken("D");
    const containedPrompt = {
      ...prompt,
      hypotheses: prompt.hypotheses.map((hypothesis, index) =>
        index === 0 ? { ...hypothesis, label: hypothesisLabel } : hypothesis
      ),
      branchOptions: prompt.branchOptions.map((branch, index) =>
        index === 0 ? { ...branch, label: branchLabel, description: branchDescription } : branch
      )
    };

    render(
      <StructuringResponseFields
        branchIds={[]}
        hypothesisId=""
        onHypothesisChange={() => undefined}
        onToggleBranch={() => undefined}
        prompt={containedPrompt}
      />
    );

    expect(screen.getByText(hypothesisLabel)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    expect(screen.getByText(branchLabel)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    expect(screen.getByText(branchDescription)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
  });

  it("contains brainstorming instructions, theme names, and idea labels", () => {
    const prompt = brainstormingPrompts[0];
    const description = unbroken("Q", 1_000);
    const themeLabel = unbroken("T", 200);
    const ideaLabel = unbroken("I");
    const containedPrompt = {
      ...prompt,
      themes: prompt.themes.map((theme, themeIndex) =>
        themeIndex === 0
          ? {
              ...theme,
              label: themeLabel,
              ideas: theme.ideas.map((idea, ideaIndex) =>
                ideaIndex === 0 ? { ...idea, label: ideaLabel } : idea
              )
            }
          : theme
      )
    };

    render(
      <BrainstormingResponseFields
        description={description}
        heading="Build your answer"
        onIdeaChange={() => undefined}
        onPriorityChange={() => undefined}
        priorityIdeaIds={[]}
        prompt={containedPrompt}
        selectedIdeaIds={[]}
      />
    );

    expect(screen.getByText(description)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    expect(screen.getByText(themeLabel)).toHaveClass("max-w-full", "[overflow-wrap:anywhere]");
    expect(screen.getByText(ideaLabel)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
  });

  it("contains every long lesson content surface, including answer feedback", async () => {
    const lesson = conceptLessons[0];
    const title = unbroken("L", 100);
    const objective = unbroken("O", 1_000);
    const principle = unbroken("P", 1_000);
    const step = unbroken("S", 1_000);
    const answer = unbroken("A", 2_000);
    const checkPrompt = unbroken("K", 2_000);
    const optionLabel = unbroken("C", 1_000);
    const explanation = unbroken("E", 2_000);
    const containedLesson = {
      ...lesson,
      title,
      objective,
      principles: [principle],
      workedExample: { ...lesson.workedExample, steps: [step], answer },
      knowledgeCheck: {
        ...lesson.knowledgeCheck,
        prompt: checkPrompt,
        explanation,
        options: lesson.knowledgeCheck.options.map((option, index) =>
          index === 0 ? { ...option, label: optionLabel } : option
        ),
        correctOptionId: lesson.knowledgeCheck.options[0].id
      }
    };

    render(
      <ConceptLessonsView
        lessons={[containedLesson]}
        storageFactory={() => new MemoryAppStorage()}
      />
    );

    expect(screen.getAllByText(title)).toHaveLength(2);
    for (const titleNode of screen.getAllByText(title)) {
      expect(titleNode).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    }
    for (const text of [objective, principle, step, answer, checkPrompt, optionLabel]) {
      expect(screen.getByText(text)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    }

    fireEvent.click(screen.getByRole("radio", { name: optionLabel }));
    fireEvent.click(screen.getByRole("button", { name: "Check Answer" }));

    const feedback = await screen.findByRole("status");
    expect(feedback.querySelector("p")).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    expect(feedback).toHaveTextContent(explanation);
  });

  it("contains custom hub module metadata, labels, descriptions, and links", () => {
    const summary = unbroken("S");
    const meta = unbroken("M", 100);
    const label = unbroken("L", 200);
    const description = unbroken("D", 1_000);

    render(
      <CasePracticeHub
        modules={[{ description, href: "/case-practice/example", label, meta }]}
        summary={summary}
      />
    );

    expect(screen.getByText(summary)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    expect(screen.getByText(meta)).toHaveClass("max-w-full", "[overflow-wrap:anywhere]");
    expect(screen.getByRole("heading", { name: label })).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    expect(screen.getByText(description)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    expect(screen.getByRole("link", { name: `Open ${label}` })).toHaveClass("max-w-full", "whitespace-normal");
  });

  it("contains exhibit title, description, and source copy outside the table scroller", () => {
    const dataset = exhibitDatasets.find((candidate) => candidate.visualization.type === "table");
    if (dataset === undefined) throw new Error("Expected a table exhibit fixture.");
    const title = unbroken("T", 100);
    const description = unbroken("D", 2_000);
    const sourceNote = unbroken("S", 1_000);

    render(<ExhibitTableRenderer dataset={{ ...dataset, title, description, sourceNote }} />);

    for (const text of [title, description, sourceNote]) {
      expect(screen.getByText(text)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    }
  });
});
