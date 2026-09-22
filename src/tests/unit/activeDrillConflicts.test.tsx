import { act, fireEvent, render, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActiveDrillSession } from "@/features/drills/ActiveDrillSession";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("conflicting drill views", () => {
  it.each(["View saved attempt", "Keep my answers as a separate attempt"])("preserves the winning completion and supports %s", async (action) => {
    const storage = new MemoryAppStorage();
    const created = createDrillSession({ seed: "two-view-conflict", settings: { questionCount: 2, tags: ["addition"], feedbackMode: "end_of_session" } });
    const factory = () => storage;
    const first = render(<ActiveDrillSession initialSession={created.session} questions={created.questions} storageFactory={factory} />);
    await waitFor(async () => expect((await storage.getDrillSession(created.session.id)).token.revision).toBe(1));
    const second = render(<ActiveDrillSession initialSession={created.session} questions={created.questions} storageFactory={factory} />);
    await waitFor(async () => expect((await storage.getDrillSession(created.session.id)).token.revision).toBe(2));
    const left = within(first.container);
    const right = within(second.container);
    fireEvent.change(left.getByLabelText("Answer"), { target: { value: "0" } });
    fireEvent.click(left.getByRole("button", { name: "Submit" }));
    expect(await left.findByRole("button", { name: action })).toBeInTheDocument();
    for (const question of created.questions) {
      fireEvent.change(right.getByLabelText("Answer"), { target: { value: String(question.answer.value) } });
      fireEvent.click(right.getByRole("button", { name: "Submit" }));
    }
    expect(await right.findByText("Session saved on this device.")).toBeInTheDocument();
    const winner = await storage.get("drill_sessions", created.session.id);
    await act(async () => fireEvent.click(left.getByRole("button", { name: action })));
    if (action === "View saved attempt") {
      expect(await left.findByText("2 correct / 2 attempted")).toBeInTheDocument();
      expect(await storage.getAll("drill_sessions")).toHaveLength(1);
    } else {
      await waitFor(async () => expect(await storage.getAll("drill_sessions")).toHaveLength(2));
      const copy = (await storage.getAll("drill_sessions")).find((item) => item.id !== created.session.id)!;
      expect(copy.responses).toHaveLength(1);
      expect(copy.responses[0].rawInput).toBe("0");
      expect(copy.startedAt).toBe(created.session.startedAt);
      expect(copy.questions).toEqual(created.questions);
    }
    expect(await storage.get("drill_sessions", created.session.id)).toEqual(winner);
    expect(await storage.getAll("responses")).toHaveLength(2);
  });

  it("does not retry a committed completion when personal-best display loading fails", async () => {
    class MissingBestsStorage extends MemoryAppStorage {
      override getAll<TStore extends Parameters<MemoryAppStorage["getAll"]>[0]>(store: TStore) {
        if (store === "benchmark_results") return Promise.reject(new Error("Presentation unavailable"));
        return super.getAll(store);
      }
    }
    const storage = new MissingBestsStorage();
    const created = createDrillSession({ seed: "committed-before-display", settings: { questionCount: 1, tags: ["addition"], feedbackMode: "end_of_session" } });
    const view = render(<ActiveDrillSession initialSession={created.session} questions={created.questions} storageFactory={() => storage} />);
    const ui = within(view.container);
    fireEvent.change(ui.getByLabelText("Answer"), { target: { value: String(created.questions[0].answer.value) } });
    fireEvent.click(ui.getByRole("button", { name: "Submit" }));
    expect(await ui.findByText("Session saved on this device.")).toBeInTheDocument();
    expect(ui.queryByRole("button", { name: "Retry Save" })).not.toBeInTheDocument();
    expect((await storage.get("drill_sessions", created.session.id))?.score).toBeDefined();
  });
});
