import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FitPracticeView } from "@/features/case-practice/fit/FitPracticeView";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("FitPracticeView accessibility", () => {
  it("describes invalid fields and focuses the first error", async () => {
    const storage = new MemoryAppStorage();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 0;
    });

    render(<FitPracticeView storageFactory={() => storage} />);

    const title = await screen.findByLabelText("Story title");
    fireEvent.click(screen.getByRole("button", { name: "Save Story" }));

    await waitFor(() => expect(title).toHaveFocus());
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAttribute("aria-describedby", "fit-story-title-error");
    expect(screen.getByText("Story title is required.")).toHaveAttribute("id", "fit-story-title-error");

    fireEvent.change(title, { target: { value: "Led a difficult turnaround" } });

    expect(title).toHaveAttribute("aria-invalid", "false");
    expect(title).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText("Story title is required.")).not.toBeInTheDocument();
  });

  it("contains imported rehearsal prompts and follow-up questions", async () => {
    const storage = new MemoryAppStorage();
    const prompt = "P".repeat(2_000);
    const followUp = "F".repeat(1_000);
    await storage.put("practice_records", {
      action: "Action",
      competency: "leadership",
      id: "fit-story-containment",
      kind: "fit_story",
      reflection: "Reflection",
      result: "Result",
      situation: "Situation",
      task: "Task",
      title: "Leadership example",
      updatedAt: "2026-08-30T12:00:00.000Z"
    });

    render(
      <FitPracticeView
        prompts={[{ competency: "leadership", followUps: [followUp], id: "fit-prompt-containment", prompt }]}
        storageFactory={() => storage}
      />
    );

    const promptNodes = await screen.findAllByText(prompt);
    const rehearsalPrompt = promptNodes.find((node) => node.tagName === "P");
    expect(rehearsalPrompt).toBeDefined();
    expect(rehearsalPrompt).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    expect(screen.getByText(followUp)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
  });
});
