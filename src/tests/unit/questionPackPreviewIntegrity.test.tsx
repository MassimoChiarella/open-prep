import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuestionPackManager } from "@/features/question-packs/QuestionPackManager";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

afterEach(() => vi.restoreAllMocks());

async function setup() {
  const storage = new MemoryAppStorage();
  render(<QuestionPackManager storageFactory={() => storage} />);
  await screen.findByText("No question packs installed.");
  const numericElement = screen.getByTestId("question-pack-builder");
  const questioningElement = screen.getByTestId("questioning-pack-builder");
  numericElement.setAttribute("open", "");
  questioningElement.setAttribute("open", "");
  const numeric = within(numericElement);
  const questioning = within(questioningElement);
  for (const [label, value] of Object.entries({
    "Pack title": "Preview integrity",
    "Question 1 prompt": "What is five times ten?",
    "Question 1 answer value": "50",
    "Question 1 explanation summary": "Multiply the two numbers.",
    "Question 1 explanation steps": "5 x 10 = 50."
  })) fireEvent.change(numeric.getByLabelText(label), { target: { value } });
  for (const [label, value] of Object.entries({
    "Pack title": "Questioning integrity",
    "Case title": "A growing retailer",
    Industry: "Retail",
    Situation: "A retailer is considering a new store.",
    Objective: "Assess profitable growth."
  })) fireEvent.change(questioning.getByLabelText(label), { target: { value } });
  return { numeric, questioning, storage };
}

async function preview(builder: ReturnType<typeof within>) {
  fireEvent.click(builder.getByRole("button", { name: "Preview Pack" }));
  const element = await screen.findByTestId("question-pack-preview");
  fireEvent.click(within(element).getByTestId("question-pack-review-confirmation"));
  return within(element);
}

describe("draft preview integrity", () => {
  it.each([
    ["numeric", "Pack ID", "revised-id"],
    ["numeric", "Version", "2.0"],
    ["questioning", "Scoring themes JSON", "{"],
    ["questioning", "Content language", "fr"]
  ] as const)("invalidates %s preview when %s changes", async (owner, label, value) => {
    const builders = await setup();
    await preview(builders[owner]);
    fireEvent.change(builders[owner].getByLabelText(label), { target: { value } });
    expect(screen.queryByTestId("question-pack-preview")).not.toBeInTheDocument();
  });

  it("preserves a reviewed file import when either unrelated draft changes or is discarded", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { numeric, questioning } = await setup();
    const text = readFileSync(resolve("public/question-pack-example.mathdrill.json"), "utf8");
    fireEvent.change(screen.getByLabelText("Choose a question pack"), {
      target: { files: [{ size: text.length, text: async () => text }] }
    });
    await screen.findByTestId("question-pack-preview");
    fireEvent.click(screen.getByTestId("question-pack-review-confirmation"));
    fireEvent.change(numeric.getByLabelText("Question 1 answer value"), { target: { value: "60" } });
    fireEvent.click(questioning.getByRole("button", { name: "Discard changes" }));
    expect(screen.getByTestId("question-pack-review-confirmation")).toBeChecked();
    expect(screen.getByTestId("question-pack-preview")).toHaveTextContent("Example Retail Practice");
  });

  it.each(["numeric", "questioning"] as const)("preserves %s work and approval when discard is cancelled", async (owner) => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const builders = await setup();
    const builder = builders[owner];
    await preview(builder);
    fireEvent.click(builder.getByRole("button", { name: "Discard changes" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByTestId("question-pack-review-confirmation")).toBeChecked();
    expect(builder.getByLabelText("Pack title")).not.toHaveValue("");
    confirm.mockReturnValue(true);
    fireEvent.click(builder.getByRole("button", { name: "Discard changes" }));
    expect(screen.queryByTestId("question-pack-preview")).not.toBeInTheDocument();
    expect(builder.getByLabelText("Pack title")).toHaveValue("");
    expect(builder.getByLabelText("Pack title")).toHaveFocus();
  });

  it.each([1, 2, 3])("confirms removal of populated question %s and focuses a survivor", async (number) => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { numeric } = await setup();
    fireEvent.click(numeric.getByRole("button", { name: "Duplicate Question 1" }));
    fireEvent.click(numeric.getByRole("button", { name: "Duplicate Question 2" }));
    await preview(numeric);
    const ids = screen.getAllByLabelText(/Question \d+ ID/).map((input) => (input as HTMLInputElement).value);
    fireEvent.click(numeric.getByRole("button", { name: `Remove Question ${number}` }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByTestId("question-pack-review-confirmation")).toBeChecked();
    expect(screen.getAllByTestId("builder-question")).toHaveLength(3);
    confirm.mockReturnValue(true);
    fireEvent.click(numeric.getByRole("button", { name: `Remove Question ${number}` }));
    expect(screen.getAllByLabelText(/Question \d+ ID/).map((input) => (input as HTMLInputElement).value))
      .toEqual(ids.filter((_, index) => index !== number - 1));
    expect(screen.queryByTestId("question-pack-preview")).not.toBeInTheDocument();
    expect(numeric.getByLabelText(`Question ${Math.min(number, 2)} prompt`)).toHaveFocus();
  });

  it.each([
    "answer", "title", "add", "duplicate", "remove", "reorder", "discard"
  ])("invalidates a reviewed numeric preview after %s", async (mutation) => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { numeric } = await setup();
    if (mutation === "remove" || mutation === "reorder") {
      fireEvent.click(numeric.getByRole("button", { name: "Duplicate Question 1" }));
    }
    await preview(numeric);
    if (mutation === "answer" || mutation === "title") {
      fireEvent.change(numeric.getByLabelText(mutation === "answer" ? "Question 1 answer value" : "Pack title"), {
        target: { value: mutation === "answer" ? "60" : "Revised title" }
      });
    } else {
      const actions: Record<string, string> = {
        add: "Add Question", duplicate: "Duplicate Question 1", remove: "Remove Question 1",
        reorder: "Move Question 2 up", discard: "Discard changes"
      };
      fireEvent.click(numeric.getByRole("button", { name: actions[mutation] }));
    }
    expect(screen.queryByTestId("question-pack-preview")).not.toBeInTheDocument();
  });

  it("requires fresh approval and saves the edited answer, not the old snapshot", async () => {
    const { numeric, storage } = await setup();
    await preview(numeric);
    fireEvent.change(numeric.getByLabelText("Question 1 answer value"), { target: { value: "60" } });
    fireEvent.click(numeric.getByRole("button", { name: "Preview Pack" }));
    const current = within(await screen.findByTestId("question-pack-preview"));
    expect(current.getByTestId("question-pack-review-confirmation")).not.toBeChecked();
    expect(current.getByRole("button", { name: "Install Pack" })).toBeDisabled();
    fireEvent.click(current.getByTestId("question-pack-review-confirmation"));
    fireEvent.click(current.getByRole("button", { name: "Install Pack" }));
    await waitFor(() => expect(storage.peekAll("question_packs")[0]).toMatchObject({
      questions: [{ answer: { value: 60 } }]
    }));
  });

  it("only invalidates the builder that owns the preview, including invalid JSON and discard", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { numeric, questioning } = await setup();
    await preview(numeric);
    fireEvent.change(questioning.getByLabelText("Objective"), { target: { value: "New objective" } });
    expect(screen.getByTestId("question-pack-review-confirmation")).toBeChecked();
    await preview(questioning);
    fireEvent.click(numeric.getByRole("button", { name: "Discard changes" }));
    expect(screen.getByTestId("question-pack-review-confirmation")).toBeChecked();
    fireEvent.change(questioning.getByLabelText("Concepts JSON"), { target: { value: "{" } });
    expect(screen.queryByTestId("question-pack-preview")).not.toBeInTheDocument();
    fireEvent.click(questioning.getByRole("button", { name: "Preview Pack" }));
    expect(screen.queryByTestId("question-pack-preview")).not.toBeInTheDocument();
  });

  it.each([false, true])("locks builders until an install settles (failure: %s)", async (fail) => {
    const { numeric, questioning, storage } = await setup();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const put = storage.put.bind(storage);
    vi.spyOn(storage, "put").mockImplementation(async (...args) => {
      await pending;
      if (fail) throw new Error("Unavailable storage");
      await put(...args);
    });
    const current = await preview(numeric);
    fireEvent.click(current.getByRole("button", { name: "Install Pack" }));
    expect(numeric.getByLabelText("Question 1 answer value")).toBeDisabled();
    expect(questioning.getByLabelText("Objective")).toBeDisabled();
    await act(async () => finish());
    await waitFor(() => expect(numeric.getByLabelText("Question 1 answer value")).toBeEnabled());
    if (fail) {
      fireEvent.change(numeric.getByLabelText("Question 1 answer value"), { target: { value: "60" } });
      expect(screen.queryByTestId("question-pack-preview")).not.toBeInTheDocument();
    } else expect(storage.peekAll("question_packs")).toHaveLength(1);
  });
});
