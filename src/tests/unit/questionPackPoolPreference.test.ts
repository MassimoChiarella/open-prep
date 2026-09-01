import { describe, expect, it } from "vitest";

import {
  buildQuestionPackPoolDraftScope,
  defaultQuestionPackPoolPreference,
  parseQuestionPackPoolPreference,
  questionPackPoolPreferenceStorageKey,
  readQuestionPackPoolPreference,
  removeQuestionPackFromPoolPreference,
  serializeQuestionPackPoolPreference,
  writeQuestionPackPoolPreference
} from "@/features/question-packs/questionPackPoolPreference";

describe("question-pack pool preference", () => {
  it("builds an order-independent draft scope that changes with mode or installed pack identity", () => {
    const first = { id: "pack-a", importedAt: "2026-08-31T12:00:00.000Z", packVersion: "1.0.0" };
    const second = { id: "pack-b", importedAt: "2026-08-31T12:01:00.000Z", packVersion: "2.0.0" };
    const additive = { mode: "built_in_and_selected" as const, selectedPackIds: ["pack-b", "pack-a"] };

    expect(buildQuestionPackPoolDraftScope(additive, [first, second])).toBe(
      buildQuestionPackPoolDraftScope(
        { ...additive, selectedPackIds: ["pack-a", "pack-b"] },
        [second, first]
      )
    );
    expect(buildQuestionPackPoolDraftScope(additive, [first, second])).not.toBe(
      buildQuestionPackPoolDraftScope({ ...additive, mode: "selected_only" }, [first, second])
    );
    expect(buildQuestionPackPoolDraftScope(additive, [first, second])).not.toBe(
      buildQuestionPackPoolDraftScope(additive, [first, { ...second, importedAt: "2026-08-31T12:02:00.000Z" }])
    );
  });

  it("defaults safely when the preference is missing or corrupt", () => {
    expect(parseQuestionPackPoolPreference(null)).toEqual(defaultQuestionPackPoolPreference);
    expect(parseQuestionPackPoolPreference("not json")).toEqual(defaultQuestionPackPoolPreference);
    expect(parseQuestionPackPoolPreference(JSON.stringify({
      mode: "selected_only",
      selectedPackIds: ["INVALID ID"]
    }))).toEqual(defaultQuestionPackPoolPreference);
  });

  it("preserves mode and order while deduplicating and capping selected IDs", () => {
    const selectedPackIds = Array.from({ length: 205 }, (_, index) => `pack-${index}`);
    const parsed = parseQuestionPackPoolPreference(JSON.stringify({
      mode: "built_in_only",
      selectedPackIds: [selectedPackIds[0], ...selectedPackIds]
    }));

    expect(parsed.mode).toBe("built_in_only");
    expect(parsed.selectedPackIds).toHaveLength(200);
    expect(parsed.selectedPackIds.slice(0, 3)).toEqual(["pack-0", "pack-1", "pack-2"]);
    expect(parsed.selectedPackIds.at(-1)).toBe("pack-199");
  });

  it("allows an empty selected-only pool so the UI can surface the blocked state", () => {
    expect(parseQuestionPackPoolPreference(JSON.stringify({
      mode: "selected_only",
      selectedPackIds: []
    }))).toEqual({ mode: "selected_only", selectedPackIds: [] });
  });

  it("reads, writes, and removes a selected pack with canonical JSON", () => {
    const storage = new MemoryPreferenceStorage();

    writeQuestionPackPoolPreference({
      mode: "built_in_and_selected",
      selectedPackIds: ["pack-b", "pack-a", "pack-b"]
    }, storage);

    expect(storage.getItem(questionPackPoolPreferenceStorageKey)).toBe(
      serializeQuestionPackPoolPreference({
        mode: "built_in_and_selected",
        selectedPackIds: ["pack-b", "pack-a"]
      })
    );
    expect(readQuestionPackPoolPreference(storage)).toEqual({
      mode: "built_in_and_selected",
      selectedPackIds: ["pack-b", "pack-a"]
    });
    expect(removeQuestionPackFromPoolPreference("pack-b", storage)).toEqual({
      mode: "built_in_and_selected",
      selectedPackIds: ["pack-a"]
    });
  });

  it("falls back on read failures and exposes write failures", () => {
    const failingStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      }
    };

    expect(readQuestionPackPoolPreference(failingStorage)).toEqual(defaultQuestionPackPoolPreference);
    expect(() => writeQuestionPackPoolPreference(defaultQuestionPackPoolPreference, failingStorage))
      .toThrow("blocked");
  });
});

class MemoryPreferenceStorage implements Pick<Storage, "getItem" | "setItem"> {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
