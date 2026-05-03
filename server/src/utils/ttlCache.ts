/**
 * Tiny TTL helpers used by in-memory caches across services.
 * Avoids re-implementing the same `Date.now() - ts < TTL_MS` predicate.
 */

/** Returns true when the timestamp `ts` (ms epoch) is within `ttlMs` of now. */
export function isFresh(ts: number, ttlMs: number): boolean {
  return Date.now() - ts < ttlMs;
}

/**
 * Optional factory for cases where a service wants a self-contained
 * single-value TTL cache without managing the timestamp by hand.
 */
export interface TTLCache<T> {
  get(): T | null;
  set(value: T): void;
  invalidate(): void;
}

export function createTTLCache<T>(ttlMs: number): TTLCache<T> {
  let value: T | null = null;
  let at = 0;
  return {
    get() {
      if (value !== null && isFresh(at, ttlMs)) return value;
      return null;
    },
    set(v: T) {
      value = v;
      at = Date.now();
    },
    invalidate() {
      value = null;
      at = 0;
    },
  };
}
