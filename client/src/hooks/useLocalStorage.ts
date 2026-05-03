import { useCallback, useEffect, useState } from "react";

/**
 * Persisted state synced with `window.localStorage`. Handles JSON encoding,
 * parse errors, and missing storage (private mode / SSR) by falling back
 * to the in-memory default.
 *
 * Keeps the same `useState` shape so callers can drop-in replace `useState`.
 *
 * Note on hydration: only the first render reads from storage — subsequent
 * setStorageOf-the-same-key from another tab triggers a re-read via the
 * native `storage` event listener.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValueState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValueState((prev) => {
        const resolved =
          typeof next === "function"
            ? (next as (p: T) => T)(prev)
            : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* quota / disabled / SSR — fall back to memory */
        }
        return resolved;
      });
    },
    [key],
  );

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== key) return;
      try {
        if (e.newValue === null) {
          setValueState(defaultValue);
        } else {
          setValueState(JSON.parse(e.newValue) as T);
        }
      } catch {
        /* noop */
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, setValue];
}
