import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuestionPackManager } from "@/features/question-packs/QuestionPackManager";
import { validateQuestionPackPayload } from "@/features/question-packs/questionPack";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

const conflictMessage = "The installed pack changed in another tab. Review it again before replacing.";

describe("question-pack replacement consent", () => {
  it.each([false, true])("requires fresh replacement consent after another tab changes an %s-existing target", async (initiallyInstalled) => {
    const storage = new MemoryAppStorage();
    if (initiallyInstalled) await storage.put("question_packs", storedPack("Previously reviewed"));
    render(<QuestionPackManager storageFactory={() => storage} view="import" />);
    const preview = await previewPack();
    const consent = within(preview).getByRole("checkbox", { name: /I reviewed the answer keys/ });
    await waitFor(() => expect(consent).toBeEnabled());
    const other = storedPack("Other tab publisher", "2.0.0");
    await act(() => storage.put("question_packs", other));
    fireEvent.click(consent);
    fireEvent.click(within(preview).getByRole("button", { name: initiallyInstalled ? "Replace Pack" : "Install Pack" }));

    expect(await screen.findByText(conflictMessage)).toBeInTheDocument();
    expect(await storage.get("question_packs", other.id)).toEqual(other);
    expect(consent).not.toBeChecked();
    expect(within(preview).getByText("Other tab publisher (v2.0.0)")).toBeInTheDocument();
    const replace = within(preview).getByRole("button", { name: "Replace Pack" });
    expect(replace).toBeDisabled();
    fireEvent.click(consent);
    fireEvent.click(replace);
    await waitFor(() => expect(storage.peekAll("question_packs")[0].title).toBe("Candidate"));
  });

  it("waits for the reviewed target read and permits retry without losing the candidate", async () => {
    const storage = new MemoryAppStorage();
    const read = vi.spyOn(storage, "get").mockRejectedValueOnce(new Error("Temporary read failure"));
    render(<QuestionPackManager storageFactory={() => storage} view="import" />);
    const preview = await previewPack();
    const consent = within(preview).getByRole("checkbox", { name: /I reviewed the answer keys/ });
    const retry = await within(preview).findByRole("button", { name: "Retry" });
    expect(consent).toBeDisabled();
    expect(within(preview).getByRole("button", { name: "Install Pack" })).toBeDisabled();
    expect(within(preview).getByRole("button", { name: "Download .mathdrill.json" })).toBeEnabled();
    fireEvent.click(retry);
    await waitFor(() => expect(consent).toBeEnabled());
    expect(read).toHaveBeenCalledTimes(2);
    expect(preview).toHaveTextContent("Candidate");
    expect(consent).not.toBeChecked();
  });
});

async function previewPack() {
  const json = JSON.stringify(payload("Candidate"));
  fireEvent.change(screen.getByLabelText("Choose a question pack"), {
    target: { files: [{ size: json.length, text: async () => json } as File] }
  });
  return screen.findByTestId("question-pack-preview");
}

function storedPack(title: string, version = "1.0.0") {
  const validation = validateQuestionPackPayload(payload(title, version), "2026-10-17T12:00:00.000Z");
  if (validation.status === "invalid") throw new Error(validation.errors.join("\n"));
  return validation.pack;
}

function payload(title: string, packVersion = "1.0.0") {
  return {
    format: "math-drill-question-pack", schemaVersion: 2, kind: "fixed_numeric",
    id: "shared-review-id", packVersion, title, publisher: title,
    questions: [{ id: "addition", type: "numeric", category: "arithmetic", tags: ["addition"], difficulty: "beginner",
      prompt: "What is 1 + 1?", answer: { value: 2, unit: "units" }, explanation: { short: "Add the two ones.", steps: ["1 + 1 = 2."] } }]
  };
}
