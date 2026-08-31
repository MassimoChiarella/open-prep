const fallbackCounters = new Map<string, number>();

export function nextLocalPracticeNonce(scope: string): number {
  const storageKey = `consulting-practice:${scope}:nonce`;

  try {
    const stored = globalThis.sessionStorage.getItem(storageKey);
    const current = stored === null ? -1 : Number(stored);
    const next = Number.isSafeInteger(current) && current >= -1 ? current + 1 : 0;
    globalThis.sessionStorage.setItem(storageKey, String(next));
    return next;
  } catch {
    const next = (fallbackCounters.get(scope) ?? -1) + 1;
    fallbackCounters.set(scope, next);
    return next;
  }
}
