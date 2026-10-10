import { useEffect, useState } from "react";
import type { Clock } from "../../domain/ports";

/** Current time, refreshed every `everyMs`. No blinking: the clock is always on screen. */
export function useNow(clock: Clock, everyMs = 30_000): Date {
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    const id = setInterval(() => setNow(clock.now()), everyMs);
    return () => clearInterval(id);
  }, [clock, everyMs]);
  return now;
}
