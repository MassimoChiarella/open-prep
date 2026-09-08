import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActiveDrillSession } from "@/features/drills/ActiveDrillSession";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { publishLocalDataInvalidation, subscribeToLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("queued drill save lifecycle", () => {
  it.each([
    { completes: false, invalidates: true },
    { completes: true, invalidates: true },
    { completes: false, invalidates: false },
    { completes: true, invalidates: false }
  ])("preserves navigation saves but cancels invalidated writes ($completes, $invalidates)", async ({ completes, invalidates }) => {
    const memory = new MemoryAppStorage();
    const pending = delayedStorageHandles(memory);
    const created = createDrillSession({ seed: "queued-save", settings: {
      questionCount: completes ? 1 : 2, tags: ["addition"], feedbackMode: "end_of_session", timeMode: "untimed"
    } });
    const view = render(<ActiveDrillSession initialSession={created.session} questions={created.questions} storageFactory={pending.factory} />);
    await waitFor(() => expect(pending.started()).toBe(true));
    fireEvent.change(screen.getByLabelText("Answer"), { target: { value: String(created.questions[0].answer.value) } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Submit" })); });

    if (invalidates) {
      await memory.clearAll();
      act(() => { publishLocalDataInvalidation("all_data_cleared", { broadcastChannelFactory: null, fallbackStorage: null }); });
    }
    view.unmount();
    await act(async () => { pending.release(); });
    await waitFor(() => expect(pending.openHandles()).toBe(0));

    const sessions = await memory.getAll("drill_sessions");
    if (invalidates) {
      expect(sessions).toEqual([]);
      expect(await memory.getAll("responses")).toEqual([]);
    } else {
      expect(sessions).toHaveLength(1);
      expect(sessions[0].responses).toHaveLength(1);
      expect(sessions[0].score !== undefined).toBe(completes);
      expect(await memory.getAll("responses")).toHaveLength(completes ? 1 : 0);
    }
  });
});

function delayedStorageHandles(memory: MemoryAppStorage) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let started = false;
  let openHandles = 0;
  return {
    release,
    started: () => started,
    openHandles: () => openHandles,
    factory: (): AppStorage => {
      // Model the production storage contract: invalidation applies to existing handles.
      const handle = Object.create(memory) as AppStorage;
      let invalidated = false;
      let closed = false;
      openHandles += 1;
      const unsubscribe = subscribeToLocalDataInvalidation(() => { invalidated = true; });
      handle.put = async (storeName, value) => {
        if (!started) {
          started = true;
          await gate;
        }
        if (invalidated) throw new Error("Local data changed. Reload before saving new work.");
        await memory.put(storeName, value);
      };
      handle.mutate = async (operations) => {
        if (invalidated) throw new Error("Local data changed. Reload before saving new work.");
        await memory.mutate(operations);
      };
      handle.close = () => {
        if (closed) return;
        closed = true;
        openHandles -= 1;
        unsubscribe();
      };
      return handle;
    }
  };
}
