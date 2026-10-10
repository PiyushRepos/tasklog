import {
  dayTitle,
  monthTitle,
  to12h,
  type DayKey,
  type MonthKey,
  type Task,
} from "./task";

/** Clean, shareable markdown. Used for index.md, copy and export. Never parsed back. */
export const taskLine = (t: Task) =>
  `- [${t.done ? "x" : " "}] ${to12h(t.time)} ${t.text}`;

export function dayDoc(day: DayKey, tasks: Task[], heading = "#"): string {
  return `${heading} ${dayTitle(day)}\n\n${tasks.map(taskLine).join("\n")}\n`;
}

export function monthDoc(
  month: MonthKey,
  days: Array<{ day: DayKey; tasks: Task[] }>,
  heading = "#",
): string {
  const sub = `${heading}#`;
  const body = days
    .filter((d) => d.tasks.length)
    .map((d) => dayDoc(d.day, d.tasks, sub))
    .join("\n");
  return `${heading} ${monthTitle(month)}\n\n${body}`;
}
