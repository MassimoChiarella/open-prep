import {
  localDataInvalidationChannel,
  localDataInvalidationFallbackKey,
  localDataInvalidationKinds,
  type LocalDataInvalidationKind
} from "@/features/settings/localDataInventory";

export interface LocalDataInvalidationMessage {
  kind: LocalDataInvalidationKind;
  token: string;
}

export type LocalDataInvalidationDelivery = "broadcast_channel" | "storage" | "unavailable";

interface InvalidationBroadcastChannel {
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
  close(): void;
  postMessage(message: unknown): void;
  removeEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
}

interface InvalidationStorageEvent {
  key: string | null;
  newValue: string | null;
}

interface InvalidationStorageEventTarget {
  addEventListener(type: "storage", listener: (event: InvalidationStorageEvent) => void): void;
  removeEventListener(type: "storage", listener: (event: InvalidationStorageEvent) => void): void;
}

type InvalidationStorage = Pick<Storage, "removeItem" | "setItem">;
type BroadcastChannelFactory = (name: string) => InvalidationBroadcastChannel;
const sameTabListeners = new Set<(value: unknown) => void>();

export interface PublishLocalDataInvalidationOptions {
  broadcastChannelFactory?: BroadcastChannelFactory | null;
  createToken?: () => string;
  fallbackStorage?: InvalidationStorage | null;
}

export interface SubscribeToLocalDataInvalidationOptions {
  broadcastChannelFactory?: BroadcastChannelFactory | null;
  storageEventTarget?: InvalidationStorageEventTarget | null;
}

export function publishLocalDataInvalidation(
  kind: LocalDataInvalidationKind,
  options: PublishLocalDataInvalidationOptions = {}
): LocalDataInvalidationDelivery {
  const message = createMessage(kind, options.createToken?.() ?? createToken());
  for (const listener of [...sameTabListeners]) listener(message);
  const factory = options.broadcastChannelFactory === undefined
    ? getBroadcastChannelFactory()
    : options.broadcastChannelFactory ?? undefined;

  if (factory !== undefined) {
    let channel: InvalidationBroadcastChannel | undefined;
    try {
      channel = factory(localDataInvalidationChannel);
      channel.postMessage(message);
      return "broadcast_channel";
    } catch {
      // A failed channel is treated as unsupported so the storage fallback can deliver the message.
    } finally {
      try {
        channel?.close();
      } catch {
        // The message was already posted; a close failure does not change delivery.
      }
    }
  }

  const storage = options.fallbackStorage === undefined
    ? getLocalStorage()
    : options.fallbackStorage ?? undefined;
  if (storage === undefined) return "unavailable";

  try {
    storage.setItem(localDataInvalidationFallbackKey, JSON.stringify(message));
    try {
      storage.removeItem(localDataInvalidationFallbackKey);
    } catch {
      // The marker contains no personal data and has already generated the required storage event.
    }
    return "storage";
  } catch {
    return "unavailable";
  }
}

export function subscribeToLocalDataInvalidation(
  listener: (message: LocalDataInvalidationMessage) => void,
  options: SubscribeToLocalDataInvalidationOptions = {}
): () => void {
  const seenTokens = new Set<string>();
  const deliver = (value: unknown) => {
    if (!isLocalDataInvalidationMessage(value) || seenTokens.has(value.token)) return;
    seenTokens.add(value.token);
    listener(value);
  };
  sameTabListeners.add(deliver);
  const onMessage = (event: { data: unknown }) => deliver(event.data);
  const onStorage = (event: InvalidationStorageEvent) => {
    if (event.key !== localDataInvalidationFallbackKey || event.newValue === null) return;
    try {
      deliver(JSON.parse(event.newValue));
    } catch {
      return;
    }
  };

  const factory = options.broadcastChannelFactory === undefined
    ? getBroadcastChannelFactory()
    : options.broadcastChannelFactory ?? undefined;
  let channel: InvalidationBroadcastChannel | undefined;
  try {
    channel = factory?.(localDataInvalidationChannel);
    channel?.addEventListener("message", onMessage);
  } catch {
    try {
      channel?.close();
    } catch {
      // Cleanup remains best effort when the channel cannot be initialized.
    }
    channel = undefined;
  }

  const storageEventTarget = options.storageEventTarget === undefined
    ? getStorageEventTarget()
    : options.storageEventTarget ?? undefined;
  let listensForStorage = false;
  try {
    storageEventTarget?.addEventListener("storage", onStorage);
    listensForStorage = storageEventTarget !== undefined;
  } catch {
    listensForStorage = false;
  }

  return () => {
    sameTabListeners.delete(deliver);
    if (channel !== undefined) {
      channel.removeEventListener("message", onMessage);
      channel.close();
    }
    if (listensForStorage) storageEventTarget?.removeEventListener("storage", onStorage);
    seenTokens.clear();
  };
}

export function isLocalDataInvalidationMessage(
  value: unknown
): value is LocalDataInvalidationMessage {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();

  return keys.length === 2 &&
    keys[0] === "kind" &&
    keys[1] === "token" &&
    localDataInvalidationKinds.some((kind) => kind === record.kind) &&
    typeof record.token === "string" &&
    record.token.length > 0 &&
    record.token.length <= 200;
}

function createMessage(kind: LocalDataInvalidationKind, token: string): LocalDataInvalidationMessage {
  const message = { kind, token };
  if (!isLocalDataInvalidationMessage(message)) {
    throw new Error("Local-data invalidation requires a non-empty token of at most 200 characters.");
  }
  return message;
}

function createToken(): string {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${Date.now().toString(36)}:${randomPart}`;
}

function getBroadcastChannelFactory(): BroadcastChannelFactory | undefined {
  if (typeof globalThis.BroadcastChannel !== "function") return undefined;
  return (name) => new globalThis.BroadcastChannel(name) as unknown as InvalidationBroadcastChannel;
}

function getLocalStorage(): InvalidationStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function getStorageEventTarget(): InvalidationStorageEventTarget | undefined {
  try {
    return typeof window === "undefined"
      ? undefined
      : window as unknown as InvalidationStorageEventTarget;
  } catch {
    return undefined;
  }
}
