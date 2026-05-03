import { useEffect, useState } from "react";

/**
 * useDebounce — returns a debounced copy of `value` that only updates
 * after `delay` ms of no changes.
 *
 * Used to gate expensive downstream effects (data refetches, derived
 * memoization) behind user-typing pauses. Mitigates P2.1 (search input lag)
 * via causa raiz: parent state updates immediately for the controlled input,
 * but the debounced value flows to filters/queries.
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
