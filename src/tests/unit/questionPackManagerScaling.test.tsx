import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuestionPackManager } from "@/features/question-packs/QuestionPackManager";
import {
  questionPackListPageSize,
  questionPackMaxInstalledBytes,
  questionPackMaxInstalledPacks
} from "@/features/question-packs/questionPack";
import type { FixedNumericQuestionPackRecord } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("QuestionPackManager installed-library scaling", () => {
  it("mounts one metadata page from hundreds of legacy packs and loads more on request", async () => {
    const storage = new MemoryAppStorage();
    await Promise.all(
      Array.from({ length: 300 }, (_, index) => storage.put("question_packs", pack(index)))
    );

    render(<QuestionPackManager storageFactory={() => storage} />);

    expect(await screen.findByText(`Showing ${questionPackListPageSize} of 300 installed packs.`))
      .toBeInTheDocument();
    expect(document.querySelectorAll('article[data-testid^="question-pack-"]')).toHaveLength(
      questionPackListPageSize
    );
    expect(screen.queryByText("Legacy detail 299")).not.toBeInTheDocument();
    expect(screen.queryByText("Legacy detail 274")).not.toBeInTheDocument();
    expect(screen.getByText("Installed pack limit")).toBeInTheDocument();
    expect(screen.getByText(/Existing packs remain available/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Manage Pack 299"));
    expect(await screen.findByText("Legacy detail 299")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show more packs" }));
    await waitFor(() => {
      expect(document.querySelectorAll('article[data-testid^="question-pack-"]')).toHaveLength(
        questionPackListPageSize * 2
      );
    });
    expect(screen.getByText(`Showing ${questionPackListPageSize * 2} of 300 installed packs.`))
      .toBeInTheDocument();
    expect(screen.queryByText("Legacy detail 274")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Manage Pack 274"));
    expect(await screen.findByText("Legacy detail 274")).toBeInTheDocument();
  });

  it("blocks one-over-count installation with localized remediation and preserves every pack", async () => {
    const storage = new MemoryAppStorage();
    await Promise.all(
      Array.from({ length: questionPackMaxInstalledPacks }, (_, index) =>
        storage.put("question_packs", pack(index))
      )
    );
    render(<QuestionPackManager storageFactory={() => storage} />);
    await screen.findByText(`Showing ${questionPackListPageSize} of ${questionPackMaxInstalledPacks} installed packs.`);

    fireEvent.change(screen.getByLabelText("Choose a question pack"), {
      target: { files: [jsonFile(packPayload("new-pack", "New pack"))] }
    });
    const preview = await screen.findByTestId("question-pack-preview");
    fireEvent.click(within(preview).getByRole("checkbox", { name: /I reviewed the answer keys/ }));
    fireEvent.click(within(preview).getByRole("button", { name: "Install Pack" }));

    expect(await screen.findByText(
      `Pack not installed. Remove an installed pack before adding another. This browser can store up to ${questionPackMaxInstalledPacks} packs.`
    )).toBeInTheDocument();
    expect(await storage.count("question_packs")).toBe(questionPackMaxInstalledPacks);
    expect(await storage.get("question_packs", "new-pack")).toBeUndefined();
  });

  it("recognizes and replaces an installed pack outside the first page without duplicating it", async () => {
    const storage = new MemoryAppStorage();
    await Promise.all(Array.from({ length: 30 }, (_, index) => storage.put("question_packs", pack(index))));
    render(<QuestionPackManager storageFactory={() => storage} />);
    await screen.findByText(`Showing ${questionPackListPageSize} of 30 installed packs.`);

    fireEvent.change(screen.getByLabelText("Choose a question pack"), {
      target: { files: [jsonFile(packPayload("pack-0", "Replacement beyond first page"))] }
    });
    const preview = await screen.findByTestId("question-pack-preview");
    await waitFor(() => expect(preview).toHaveTextContent("Replace installed pack"));
    fireEvent.click(within(preview).getByRole("checkbox", { name: /I reviewed the answer keys/ }));
    fireEvent.click(within(preview).getByRole("button", { name: "Replace Pack" }));

    await waitFor(() => {
      expect(storage.peekAll("question_packs").find(({ id }) => id === "pack-0")).toMatchObject({
        title: "Replacement beyond first page"
      });
    });
    expect(await storage.count("question_packs")).toBe(30);
    expect(screen.getByText("Showing 26 of 30 installed packs.")).toBeInTheDocument();
    expect(screen.getAllByTestId("question-pack-pack-0")).toHaveLength(1);
  });

  it("explains how to recover when installed-pack bytes would exceed the quota", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("question_packs", pack(0));

    render(<QuestionPackManager storageFactory={() => storage} />);
    await screen.findByText("Showing 1 of 1 installed packs.");
    fireEvent.change(screen.getByLabelText("Choose a question pack"), {
      target: { files: [jsonFile(packPayload("new-pack", "New pack"))] }
    });
    const preview = await screen.findByTestId("question-pack-preview");
    fireEvent.click(within(preview).getByRole("checkbox", { name: /I reviewed the answer keys/ }));
    const encode = vi.spyOn(TextEncoder.prototype, "encode").mockReturnValue({
      byteLength: questionPackMaxInstalledBytes + 1
    } as Uint8Array<ArrayBuffer>);
    fireEvent.click(within(preview).getByRole("button", { name: "Install Pack" }));

    expect(await screen.findByText(
      "Pack not installed. Remove packs or replace one with a smaller pack. Installed-pack data is limited to 20 MiB."
    )).toBeInTheDocument();
    expect(await storage.count("question_packs")).toBe(1);
    expect(await storage.get("question_packs", "new-pack")).toBeUndefined();
    encode.mockRestore();
  });

  it("disables a repeated delete and refreshes the installed count from storage", async () => {
    const storage = new MemoryAppStorage();
    await storage.put("question_packs", pack(0));
    const gate = deferred<void>();
    const remove = storage.delete.bind(storage);
    const deleteSpy = vi.spyOn(storage, "delete").mockImplementation(async (...args) => {
      await gate.promise;
      await remove(...args);
    });

    render(<QuestionPackManager storageFactory={() => storage} />);
    await screen.findByText("Showing 1 of 1 installed packs.");
    const card = screen.getByTestId("question-pack-pack-0");
    fireEvent.click(within(card).getByText("Manage Pack 0"));
    fireEvent.click(await within(card).findByRole("button", { name: "Remove local pack" }));
    const confirm = within(card).getByRole("button", { name: "Remove Pack" });

    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(within(card).getByRole("button", { name: "Removing..." })).toBeDisabled();
    await waitFor(() => expect(deleteSpy).toHaveBeenCalledOnce());

    await act(async () => gate.resolve());
    await waitFor(() => expect(storage.peekAll("question_packs")).toEqual([]));
    expect(screen.getByText("No question packs installed.")).toBeInTheDocument();
    expect(screen.queryByText(/Showing .* installed packs/)).not.toBeInTheDocument();
    deleteSpy.mockRestore();
  });
});

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}

function jsonFile(payload: unknown): File {
  const json = JSON.stringify(payload);
  return { size: json.length, text: async () => json } as unknown as File;
}

function packPayload(id: string, title: string): unknown {
  return {
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "fixed_numeric",
    id,
    packVersion: "2.0.0",
    title,
    questions: [{
      id: "question-1",
      type: "numeric",
      category: "arithmetic",
      tags: ["addition"],
      difficulty: "beginner",
      prompt: "1 + 1 = ?",
      answer: { value: 2, unit: "none" },
      explanation: { short: "Add.", steps: ["1 + 1 = 2."] }
    }]
  };
}

function pack(index: number): FixedNumericQuestionPackRecord {
  const payload = packPayload(`pack-${index}`, `Pack ${index}`) as Omit<FixedNumericQuestionPackRecord, "importedAt">;
  return {
    ...payload,
    description: `Legacy detail ${index}`,
    importedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString()
  };
}
