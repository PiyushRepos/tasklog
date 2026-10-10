import { useCallback, useEffect, useState } from "react";
import type { DayKey, DaySummary, Task } from "../../domain/task";
import { useApp } from "../services-context";

/** Day summaries for the sidebar plus the tasks of the selected day. */
export function useLibrary(day: DayKey) {
  const { services, toast } = useApp();
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const reload = useCallback(async () => {
    const [s, t] = await Promise.all([
      services.tasks.summaries(),
      services.tasks.readDay(day),
    ]);
    setSummaries(s);
    setTasks(t);
    return t;
  }, [services, day]);

  useEffect(() => {
    reload().catch((e: Error) => toast(e.message, "danger"));
  }, [reload, toast]);

  return { summaries, tasks, reload };
}
