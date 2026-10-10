import { useEffect, useState } from "react";

/**
 * Motion policy (Emil Kowalski's frequency rule, applied to a terminal):
 *
 * | Element                         | Frequency      | Motion                                          |
 * |---------------------------------|----------------|-------------------------------------------------|
 * | list movement, toggle, add, edit| 100+/day       | none, the next frame shows the result           |
 * | screen switches (/, T, s, ?)    | tens/day       | none (Raycast-style instant)                    |
 * | progress meter on toggle        | tens/day       | none, the number must be trustworthy instantly  |
 * | toast enter                     | occasional     | 140ms ease-out fade from the grid line colour   |
 * | toast exit                      | occasional     | instant (exit faster than enter)                |
 * | armed "delete forever"          | rare           | linear drain over the 2s confirm window         |
 * | delete a task (d)               | occasional     | 1.2s red fill across the row; esc/u cancels, d  |
 * |                                 |                | again deletes now; lands when the fill is full  |
 * | restore from trash (r)          | occasional     | 1.2s green fill across the row; esc cancels     |
 * | undone / restored / opened task | occasional     | 700ms ease-out green sweep across the row       |
 * | mouse press on a button         | rare in a TUI  | 120ms inverse flash (press feedback)            |
 *
 * Set TASKLOG_REDUCED_MOTION=1 (or NO_MOTION=1) to drop every animation; states still change.
 */
export const motion = {
  toastEnterMs: 140,
  pressMs: 120,
  confirmWindowMs: 2000,
  deleteWindowMs: 1200, // also the restore window
  rowArriveMs: 700,
  frameMs: 20,
} as const;

export const reducedMotion = (env = process.env) =>
  env.TASKLOG_REDUCED_MOTION === "1" || env.NO_MOTION === "1";

/** Strong ease-out: fast start so feedback feels immediate. */
export const easeOut = (t: number) =>
  1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);

/** Linear blend between two #rrggbb colours. */
export function mix(from: string, to: string, t: number): string {
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const ch = (shift: number) =>
    Math.round(
      ((a >> shift) & 255) + (((b >> shift) & 255) - ((a >> shift) & 255)) * t,
    );
  return (
    "#" + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")
  );
}

/**
 * 0→1 over `durationMs` each time `trigger` changes (pass `null` to stay at 1).
 * Returns 1 immediately under reduced motion.
 */
export function useProgress(trigger: unknown, durationMs: number): number {
  const [t, setT] = useState(1);
  useEffect(() => {
    if (trigger === null || trigger === undefined || reducedMotion())
      return setT(1);
    const start = Date.now();
    setT(0);
    const id = setInterval(() => {
      const next = (Date.now() - start) / durationMs;
      setT(Math.min(1, next));
      if (next >= 1) clearInterval(id);
    }, motion.frameMs);
    return () => clearInterval(id);
  }, [trigger, durationMs]);
  return t;
}
