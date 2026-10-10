import { useEffect, useRef, useState } from "react";
import { useProgress } from "../design/motion";

/**
 * An action that lands after `ms` unless cancelled (cancellable delete / restore).
 * `progress` drives the row fill. Leaving the screen commits rather than silently dropping it.
 */
export function usePending<T>(ms: number) {
  const ref = useRef<{
    value: T;
    run(): unknown;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const [value, setValue] = useState<T | null>(null);
  const progress = useProgress(value, ms);
  const take = () => {
    const p = ref.current;
    if (p) {
      clearTimeout(p.timer);
      ref.current = null;
      setValue(null);
    }
    return p;
  };
  const commit = () => Promise.resolve(take()?.run());
  const cancel = () => take()?.value;
  /** `run` may return a promise; `commit()` returns it so callers can wait (e.g. before quitting). */
  const start = (v: T, run: () => unknown) => {
    commit();
    ref.current = { value: v, run, timer: setTimeout(commit, ms) };
    setValue(v);
  };
  useEffect(() => () => void commit(), []);
  return {
    value,
    progress,
    isActive: () => ref.current !== null,
    start,
    commit,
    cancel,
  };
}
