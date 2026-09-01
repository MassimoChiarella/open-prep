import { describe, expect, it, vi } from "vitest";

import {
  isLocalDataInvalidationMessage,
  publishLocalDataInvalidation,
  subscribeToLocalDataInvalidation,
  type LocalDataInvalidationMessage
} from "@/features/settings/localDataInvalidation";
import {
  localDataInvalidationChannel,
  localDataInvalidationFallbackKey
} from "@/features/settings/localDataInventory";

describe("local data invalidation", () => {
  it("publishes the tiny message through BroadcastChannel and closes it", () => {
    const channel = new TestBroadcastChannel();
    const fallbackStorage = new TestInvalidationStorage();

    const delivery = publishLocalDataInvalidation("personal_data_cleared", {
      broadcastChannelFactory: (name) => {
        expect(name).toBe(localDataInvalidationChannel);
        return channel;
      },
      createToken: () => "token-1",
      fallbackStorage
    });

    expect(delivery).toBe("broadcast_channel");
    expect(channel.posted).toEqual([{ kind: "personal_data_cleared", token: "token-1" }]);
    expect(Object.keys(channel.posted[0] as object)).toEqual(["kind", "token"]);
    expect(channel.closed).toBe(true);
    expect(fallbackStorage.writes).toEqual([]);
  });

  it("uses and removes the storage marker when BroadcastChannel is unavailable", () => {
    const fallbackStorage = new TestInvalidationStorage();

    const delivery = publishLocalDataInvalidation("all_data_cleared", {
      broadcastChannelFactory: null,
      createToken: () => "token-2",
      fallbackStorage
    });

    expect(delivery).toBe("storage");
    expect(fallbackStorage.writes).toEqual([{
      key: localDataInvalidationFallbackKey,
      value: JSON.stringify({ kind: "all_data_cleared", token: "token-2" })
    }]);
    expect(fallbackStorage.removals).toEqual([localDataInvalidationFallbackKey]);
  });

  it("delivers in the publishing tab even when cross-tab transport is unavailable", () => {
    const listener = vi.fn();
    const cleanup = subscribeToLocalDataInvalidation(listener, {
      broadcastChannelFactory: null,
      storageEventTarget: null
    });

    expect(publishLocalDataInvalidation("personal_data_cleared", {
      broadcastChannelFactory: null,
      createToken: () => "same-tab-token",
      fallbackStorage: null
    })).toBe("unavailable");
    expect(listener).toHaveBeenCalledWith({
      kind: "personal_data_cleared",
      token: "same-tab-token"
    });

    cleanup();
  });

  it("subscribes to both paths, suppresses duplicate tokens, and cleans up", () => {
    const channel = new TestBroadcastChannel();
    const eventTarget = new TestStorageEventTarget();
    const listener = vi.fn<(message: LocalDataInvalidationMessage) => void>();
    const cleanup = subscribeToLocalDataInvalidation(listener, {
      broadcastChannelFactory: () => channel,
      storageEventTarget: eventTarget
    });
    const message = { kind: "personal_data_cleared", token: "shared-token" } as const;

    channel.emit(message);
    eventTarget.emit(localDataInvalidationFallbackKey, JSON.stringify(message));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(message);
    cleanup();
    expect(channel.closed).toBe(true);
    expect(channel.listenerCount).toBe(0);
    expect(eventTarget.listenerCount).toBe(0);

    channel.emit({ kind: "all_data_cleared", token: "after-cleanup" });
    eventTarget.emit(localDataInvalidationFallbackKey, JSON.stringify({
      kind: "all_data_cleared",
      token: "after-cleanup"
    }));
    expect(listener).toHaveBeenCalledOnce();
  });

  it("ignores malformed, unknown, wrong-key, and removal messages", () => {
    const channel = new TestBroadcastChannel();
    const eventTarget = new TestStorageEventTarget();
    const listener = vi.fn();
    const cleanup = subscribeToLocalDataInvalidation(listener, {
      broadcastChannelFactory: () => channel,
      storageEventTarget: eventTarget
    });

    for (const value of [
      null,
      { kind: "unknown", token: "token" },
      { kind: "all_data_cleared", token: "" },
      { extra: true, kind: "all_data_cleared", token: "token" }
    ]) channel.emit(value);
    eventTarget.emit("another-key", JSON.stringify({ kind: "all_data_cleared", token: "token" }));
    eventTarget.emit(localDataInvalidationFallbackKey, "not-json");
    eventTarget.emit(localDataInvalidationFallbackKey, null);

    expect(listener).not.toHaveBeenCalled();
    expect(isLocalDataInvalidationMessage({ kind: "all_data_cleared", token: "valid" })).toBe(true);
    cleanup();
  });

  it("is safe when browser delivery globals are unavailable and never accesses the network", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const listener = vi.fn();

    expect(publishLocalDataInvalidation("all_data_cleared", {
      broadcastChannelFactory: null,
      createToken: () => "offline-token",
      fallbackStorage: null
    })).toBe("unavailable");
    const cleanup = subscribeToLocalDataInvalidation(listener, {
      broadcastChannelFactory: null,
      storageEventTarget: null
    });
    cleanup();

    expect(listener).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

class TestBroadcastChannel {
  closed = false;
  posted: unknown[] = [];
  private readonly listeners = new Set<(event: { data: unknown }) => void>();

  get listenerCount(): number {
    return this.listeners.size;
  }

  addEventListener(_type: "message", listener: (event: { data: unknown }) => void): void {
    this.listeners.add(listener);
  }

  close(): void {
    this.closed = true;
  }

  emit(data: unknown): void {
    for (const listener of this.listeners) listener({ data });
  }

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  removeEventListener(_type: "message", listener: (event: { data: unknown }) => void): void {
    this.listeners.delete(listener);
  }
}

class TestStorageEventTarget {
  private readonly listeners = new Set<(event: { key: string | null; newValue: string | null }) => void>();

  get listenerCount(): number {
    return this.listeners.size;
  }

  addEventListener(
    _type: "storage",
    listener: (event: { key: string | null; newValue: string | null }) => void
  ): void {
    this.listeners.add(listener);
  }

  emit(key: string | null, newValue: string | null): void {
    for (const listener of this.listeners) listener({ key, newValue });
  }

  removeEventListener(
    _type: "storage",
    listener: (event: { key: string | null; newValue: string | null }) => void
  ): void {
    this.listeners.delete(listener);
  }
}

class TestInvalidationStorage {
  readonly removals: string[] = [];
  readonly writes: Array<{ key: string; value: string }> = [];

  removeItem(key: string): void {
    this.removals.push(key);
  }

  setItem(key: string, value: string): void {
    this.writes.push({ key, value });
  }
}
