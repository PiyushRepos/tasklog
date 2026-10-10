import { useCallback, useEffect, useRef, useState } from "react";
import type { Tone } from "../design/tokens";

export interface Toast {
  text: string;
  tone: Tone;
}

/** One message at a time in the status line. A new message replaces the old one and restarts the timer. */
export function useToastState(durationMs = 3500) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(
    (text: string, tone: Tone = "info") => {
      clearTimeout(timer.current);
      setToast({ text, tone });
      timer.current = setTimeout(() => setToast(null), durationMs);
    },
    [durationMs],
  );

  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, show };
}
