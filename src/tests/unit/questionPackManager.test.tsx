import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { brainstormingPrompts } from "@/data/casePractice/brainstormingPrompts";
import { conceptLessons } from "@/data/casePractice/conceptLessons";
import { fitPracticePrompts } from "@/data/casePractice/fitPrompts";
import { fullCaseSimulations } from "@/data/casePractice/fullCaseSimulations";
import { structuringPrompts } from "@/data/casePractice/structuringPrompts";
import { synthesisPrompts } from "@/data/casePractice/synthesisPrompts";
import { QuestionPackManager } from "@/features/question-packs/QuestionPackManager";
import { questionPackMaxFileBytes } from "@/features/question-packs/questionPack";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");

afterEach(() => {
  if (originalClipboardDescriptor === undefined) {
    Reflect.deleteProperty(navigator, "clipboard");
  } else {
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
  }
});

describe("QuestionPackManager", () => {
  it("links to the download library", async () => {
    render(<QuestionPackManager storageFactory={() => new MemoryAppStorage()} />);

    await screen.findByText("No question packs installed.");
    expect(screen.getByRole("link", { name: "Browse downloads and authoring resources" })).toHaveAttribute(
      "href",
      "/content-packs/downloads"
    );
  });

  it("builds, validates, previews, and installs a pack without editing JSON", async () => {
    const storage = new MemoryAppStorage();
    render(<QuestionPackManager storageFactory={() => storage} />);

    await screen.findByText("No question packs installed.");
    fireEvent.click(screen.getByText("Build a question pack"));
    const builder = within(screen.getByTestId("question-pack-builder"));
    fireEvent.change(builder.getByLabelText("Pack title"), { target: { value: "Workshop Practice" } });
    fireEvent.change(builder.getByLabelText("Question 1 prompt"), {
      target: { value: "Six teams prepare 18 kits each. How many kits are prepared?" }
    });
    fireEvent.change(builder.getByLabelText("Question 1 answer value"), { target: { value: "108" } });
    fireEvent.change(builder.getByLabelText("Question 1 unit"), { target: { value: "units" } });
    fireEvent.change(builder.getByLabelText("Question 1 primary tag"), { target: { value: "multiplication" } });
    fireEvent.change(builder.getByLabelText("Question 1 explanation summary"), {
      target: { value: "Multiply teams by kits per team." }
    });
    fireEvent.change(builder.getByLabelText("Question 1 explanation steps"), {
      target: { value: "6 x 18 = 108." }
    });
    fireEvent.click(builder.getByRole("button", { name: "Preview Pack" }));

    const preview = await screen.findByTestId("question-pack-preview");
    expect(within(preview).getByText(/Workshop Practice/)).toBeInTheDocument();
    expect(within(preview).getByText(/Answer: 108 units/i)).toBeInTheDocument();
    fireEvent.click(within(preview).getByRole("button", { name: "Install Pack" }));

    await waitFor(() => expect(storage.peekAll("question_packs")).toHaveLength(1));
    expect(storage.peekAll("question_packs")[0]).toMatchObject({
      id: "workshop-practice",
      title: "Workshop Practice"
    });
  });

  it("previews, explicitly installs, starts, and removes a local pack", async () => {
    const storage = new MemoryAppStorage();

    render(<QuestionPackManager storageFactory={() => storage} />);

    expect(await screen.findByText("No question packs installed.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Choose a question pack"), {
      target: { files: [jsonFile(validPackPayload())] }
    });

    const preview = await screen.findByTestId("question-pack-preview");

    expect(within(preview).getByText(/Ready to install/)).toBeInTheDocument();
    expect(within(preview).getByText(/Revenue is \$12M/)).toBeInTheDocument();
    expect(within(preview).getByText(/Answer: 25%/)).toBeInTheDocument();
    expect(storage.peekAll("question_packs")).toEqual([]);

    fireEvent.click(within(preview).getByRole("button", { name: "Install Pack" }));

    await waitFor(() => expect(storage.peekAll("question_packs")).toHaveLength(1));

    const card = await screen.findByTestId("question-pack-company-case-prep");
    const startLink = within(card).getByRole("link", { name: "Practice intermediate (1)" });
    const params = new URL(startLink.getAttribute("href") ?? "", "http://localhost").searchParams;

    expect(params.get("source")).toBe("question_pack");
    expect(params.get("pack")).toBe("company-case-prep");
    expect(params.get("difficulty")).toBe("intermediate");
    expect(params.get("count")).toBe("1");

    fireEvent.click(within(card).getByRole("button", { name: "Remove local pack" }));
    fireEvent.click(within(card).getByRole("button", { name: "Remove Pack" }));

    await waitFor(() => expect(storage.peekAll("question_packs")).toEqual([]));
    expect(screen.getByText("No question packs installed.")).toBeInTheDocument();
  });

  it("previews and starts five generated variants from a v2 template pack", async () => {
    const storage = new MemoryAppStorage();
    const payload = JSON.parse(
      readFileSync(resolve(process.cwd(), "public/question-pack-template-example.mathdrill.json"), "utf8")
    ) as unknown;
    render(<QuestionPackManager storageFactory={() => storage} />);
    await screen.findByText("No question packs installed.");

    fireEvent.change(screen.getByLabelText("Choose a question pack"), {
      target: { files: [jsonFile(payload)] }
    });
    const preview = await screen.findByTestId("question-pack-preview");
    expect(within(preview).getByText(/1 generated templates/)).toBeInTheDocument();
    expect(within(preview).getByText(/A pop-up shop sells/)).toBeInTheDocument();
    fireEvent.click(within(preview).getByRole("button", { name: "Install Pack" }));

    const card = await screen.findByTestId("question-pack-example-generated-retail");
    expect(within(card).getByText("Generated templates")).toBeInTheDocument();
    const href = within(card).getByRole("link", { name: "Practice beginner (1)" }).getAttribute("href");
    expect(new URL(href ?? "", "http://localhost").searchParams.get("count")).toBe("5");
  });

  it("previews, installs, and opens a v2 case-practice pack", async () => {
    const storage = new MemoryAppStorage();
    render(<QuestionPackManager storageFactory={() => storage} />);
    await screen.findByText("No question packs installed.");

    fireEvent.change(screen.getByLabelText("Choose a question pack"), {
      target: { files: [jsonFile(casePracticePackPayload())] }
    });

    const preview = await screen.findByTestId("question-pack-preview");
    expect(within(preview).getByText(/6 case-practice exercises/)).toBeInTheDocument();
    expect(within(preview).getByText("Modules")).toBeInTheDocument();
    expect(
      within(preview).getByText(
        "Structuring (1), Brainstorming (1), Synthesis (1), Lessons (1), Fit (1), Full cases (1)"
      )
    ).toBeInTheDocument();
    expect(within(preview).getByText(new RegExp(structuringPrompts[0]!.title))).toBeInTheDocument();
    expect(within(preview).getByText(new RegExp(brainstormingPrompts[0]!.title))).toBeInTheDocument();
    expect(within(preview).getByText(new RegExp(synthesisPrompts[0]!.title))).toBeInTheDocument();

    fireEvent.click(within(preview).getByRole("button", { name: "Install Pack" }));
    await waitFor(() => expect(storage.peekAll("question_packs")).toHaveLength(1));

    const card = await screen.findByTestId("question-pack-case-practice-training");
    expect(within(card).getByText("Case practice")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Open Case practice" })).toHaveAttribute(
      "href",
      "/case-practice?pack=case-practice-training"
    );
  });

  it("previews, installs, and opens a version-three questioning pack", async () => {
    const storage = new MemoryAppStorage();
    const payload = JSON.parse(
      readFileSync(resolve(process.cwd(), "public/question-pack-case-questioning-example.mathdrill.json"), "utf8")
    ) as unknown;
    render(<QuestionPackManager storageFactory={() => storage} />);
    await screen.findByText("No question packs installed.");

    fireEvent.change(screen.getByLabelText("Choose a question pack"), {
      target: { files: [jsonFile(payload)] }
    });

    const preview = await screen.findByTestId("question-pack-preview");
    expect(within(preview).getByText(/1 case-practice exercise/)).toBeInTheDocument();
    expect(within(preview).getByText("Questioning (1)")).toBeInTheDocument();
    expect(within(preview).getByText(/Northline Software Churn/)).toBeInTheDocument();

    fireEvent.click(within(preview).getByRole("button", { name: "Install Pack" }));
    await waitFor(() => expect(storage.peekAll("question_packs")).toHaveLength(1));

    const card = await screen.findByTestId("question-pack-customer-retention-questioning");
    expect(within(card).getByRole("link", { name: "Open Case practice" })).toHaveAttribute(
      "href",
      "/case-practice?pack=customer-retention-questioning"
    );
  });

  it("rejects an oversized file before reading it", async () => {
    const storage = new MemoryAppStorage();
    const text = vi.fn<() => Promise<string>>().mockResolvedValue("{}");
    const oversized = { size: questionPackMaxFileBytes + 1, text } as unknown as File;

    render(<QuestionPackManager storageFactory={() => storage} />);
    fireEvent.change(screen.getByLabelText("Choose a question pack"), { target: { files: [oversized] } });

    expect(await screen.findByText(/must be 5 MiB or smaller/)).toBeInTheDocument();
    expect(text).not.toHaveBeenCalled();
    expect(storage.peekAll("question_packs")).toEqual([]);
  });

  it("reads a file whose reported size is exactly the limit", async () => {
    const json = JSON.stringify(validPackPayload());
    const text = vi.fn<() => Promise<string>>().mockResolvedValue(json);
    const atLimit = { size: questionPackMaxFileBytes, text } as unknown as File;

    render(<QuestionPackManager storageFactory={() => new MemoryAppStorage()} />);
    fireEvent.change(screen.getByLabelText("Choose a question pack"), { target: { files: [atLimit] } });

    expect(await screen.findByTestId("question-pack-preview")).toBeInTheDocument();
    expect(text).toHaveBeenCalledOnce();
  });

  it("shows each validation problem with an author-friendly question number", async () => {
    const payload = validPackPayload() as {
      questions: { answer: Record<string, unknown>; explanation: { steps: string[] } }[];
    };
    Reflect.deleteProperty(payload.questions[0].answer, "unit");
    payload.questions[0].explanation.steps = [];

    render(<QuestionPackManager storageFactory={() => new MemoryAppStorage()} />);
    fireEvent.change(screen.getByLabelText("Choose a question pack"), {
      target: { files: [jsonFile(payload)] }
    });

    expect(await screen.findByText("Fix 2 problems before importing")).toBeInTheDocument();
    expect(screen.getByText("Question 1 · Answer unit is required.")).toBeInTheDocument();
    expect(screen.getByText("Question 1 · Explanation steps must contain at least one step.")).toBeInTheDocument();
  });

  it("copies a repair handoff containing every exact validation error", async () => {
    const payload = validPackPayload() as {
      questions: Array<{ answer: Record<string, unknown>; id: string }>;
    };
    const sourceQuestion = payload.questions[0]!;
    payload.questions = Array.from({ length: 21 }, (_, index) => {
      const answer = { ...sourceQuestion.answer };
      Reflect.deleteProperty(answer, "unit");
      return { ...sourceQuestion, answer, id: `margin-${index + 1}` };
    });
    const writeText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    setClipboard({ writeText });

    render(<QuestionPackManager storageFactory={() => new MemoryAppStorage()} />);
    fireEvent.change(screen.getByLabelText("Choose a question pack"), {
      target: { files: [jsonFile(payload)] }
    });

    expect(await screen.findByText("Fix 21 problems before importing")).toBeInTheDocument();
    expect(screen.getByText("Showing the first 20 problems.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy all validation errors" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    const handoff = writeText.mock.calls[0]![0];
    expect(handoff).toContain("The Math Drill webapp importer is authoritative.");
    expect(handoff).toContain("Importer file-size limit: 5 MiB.");
    expect(handoff).toContain("Exact validation errors (21):");
    expect(handoff.match(/\$\.questions\[\d+\]\.answer\.unit is required/g)).toHaveLength(21);
    expect(handoff).toContain("21. $.questions[20].answer.unit is required.");
    expect(
      await screen.findByText(
        "Copied. Attach the original package and paste this repair handoff into your AI chat."
      )
    ).toBeInTheDocument();
  });

  it("reports rejected and unavailable clipboard access", async () => {
    const payload = validPackPayload() as { questions: Array<{ answer: Record<string, unknown> }> };
    Reflect.deleteProperty(payload.questions[0]!.answer, "unit");
    const writeText = vi.fn<(value: string) => Promise<void>>().mockRejectedValue(new Error("denied"));
    setClipboard({ writeText });

    const { unmount } = render(<QuestionPackManager storageFactory={() => new MemoryAppStorage()} />);
    fireEvent.change(screen.getByLabelText("Choose a question pack"), {
      target: { files: [jsonFile(payload)] }
    });
    fireEvent.click(await screen.findByRole("button", { name: "Copy all validation errors" }));
    expect(
      await screen.findByText("Could not copy validation errors. Check clipboard permission and try again.")
    ).toBeInTheDocument();

    unmount();
    setClipboard(undefined);
    render(<QuestionPackManager storageFactory={() => new MemoryAppStorage()} />);
    fireEvent.change(screen.getByLabelText("Choose a question pack"), {
      target: { files: [jsonFile(payload)] }
    });
    fireEvent.click(await screen.findByRole("button", { name: "Copy all validation errors" }));
    expect(await screen.findByText("Clipboard access is unavailable in this browser.")).toBeInTheDocument();
  });
});

function setClipboard(clipboard: Pick<Clipboard, "writeText"> | undefined): void {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });
}

function jsonFile(payload: unknown): File {
  const json = JSON.stringify(payload);
  return { size: json.length, text: async () => json } as unknown as File;
}

function validPackPayload(): unknown {
  return {
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "fixed_numeric",
    id: "company-case-prep",
    packVersion: "1.0.0",
    title: "Company Case Prep",
    questions: [
      {
        id: "margin-001",
        type: "numeric",
        category: "business_math",
        tags: ["margin"],
        difficulty: "intermediate",
        prompt: "Revenue is $12M and profit is $3M. What is the profit margin?",
        answer: {
          value: 0.25,
          unit: "percentage",
          tolerance: { type: "absolute", value: 0.001 }
        },
        explanation: {
          short: "Divide profit by revenue.",
          steps: ["Margin = 3 / 12 = 0.25, or 25%."]
        }
      }
    ]
  };
}

function casePracticePackPayload(): unknown {
  return {
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "case_practice",
    id: "case-practice-training",
    packVersion: "1.0.0",
    title: "Case Practice Training",
    structuringPrompts: structuringPrompts.slice(0, 1),
    brainstormingPrompts: brainstormingPrompts.slice(0, 1),
    synthesisPrompts: synthesisPrompts.slice(0, 1),
    lessons: conceptLessons.slice(0, 1),
    fitPrompts: fitPracticePrompts.slice(0, 1),
    fullCases: fullCaseSimulations.slice(0, 1).map(({ questioning: _questioning, ...fullCase }) => fullCase)
  };
}
