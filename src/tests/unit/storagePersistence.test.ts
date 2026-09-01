import { describe, expect, it, vi } from "vitest";

import {
  queryStoragePersistence,
  requestStoragePersistence
} from "@/features/settings/storagePersistence";

describe("storage persistence capability", () => {
  it("reports Unsupported without invoking a prompt", async () => {
    await expect(queryStoragePersistence(undefined)).resolves.toBe("unsupported");
    await expect(requestStoragePersistence({ persisted: async () => false })).resolves.toBe("unsupported");
  });

  it.each([
    [true, "persistent"],
    [false, "best_effort"]
  ] as const)("queries current status %s as %s", async (persisted, expected) => {
    const persist = vi.fn();
    await expect(queryStoragePersistence({ persist, persisted: async () => persisted })).resolves.toBe(expected);
    expect(persist).not.toHaveBeenCalled();
  });

  it("does not request again when storage is already persistent", async () => {
    const persist = vi.fn();
    await expect(requestStoragePersistence({ persist, persisted: async () => true })).resolves.toBe("persistent");
    expect(persist).not.toHaveBeenCalled();
  });

  it.each([
    [true, "persistent"],
    [false, "best_effort"]
  ] as const)("reports explicit request result %s as %s", async (granted, expected) => {
    const persist = vi.fn().mockResolvedValue(granted);
    await expect(requestStoragePersistence({ persist, persisted: async () => false })).resolves.toBe(expected);
    expect(persist).toHaveBeenCalledOnce();
  });

  it("reports API errors without claiming persistence", async () => {
    await expect(queryStoragePersistence({ persisted: async () => { throw new Error("blocked"); } })).resolves.toBe("error");
    await expect(requestStoragePersistence({
      persist: async () => { throw new Error("blocked"); },
      persisted: async () => false
    })).resolves.toBe("error");
  });
});
