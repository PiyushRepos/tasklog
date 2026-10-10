import { useCallback } from "react";
import {
  dayTitle,
  monthOf,
  monthTitle,
  yearOf,
  type DayKey,
} from "../../domain/task";
import { useApp } from "../services-context";

export type CopyScope = "day" | "month" | "year";

/** Copies the day, month or year around `day` as clean markdown and reports the result. */
export function useCopy() {
  const { services, clipboard, toast } = useApp();
  return useCallback(
    async (scope: CopyScope, day: DayKey) => {
      const [result, label] =
        scope === "day"
          ? [await services.exporter.day(day), dayTitle(day)]
          : scope === "month"
            ? [
                await services.exporter.month(monthOf(day)),
                monthTitle(monthOf(day)),
              ]
            : [await services.exporter.year(yearOf(day)), yearOf(day)];
      if (!result.taskCount)
        return toast(`Nothing to copy in ${label}`, "warn");
      const ok = await clipboard.copy(result.text);
      const n = `${result.taskCount} task${result.taskCount === 1 ? "" : "s"}`;
      toast(
        ok
          ? `Copied ${label} · ${n}`
          : "Clipboard unavailable here. Try: tasklog export " +
              day.slice(0, scope === "day" ? 10 : scope === "month" ? 7 : 4),
        ok ? "success" : "warn",
      );
    },
    [services, clipboard, toast],
  );
}
