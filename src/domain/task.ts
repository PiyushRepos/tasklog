/** YYYY-MM-DD in local time. */
export type DayKey = string;
/** YYYY-MM. Sorts correctly across years. */
export type MonthKey = string;

export interface Task {
  id: string;
  day: DayKey;
  /** HH:MM, 24h */
  time: string;
  text: string;
  done: boolean;
}

export interface TrashedTask extends Task {
  /** ISO timestamp */
  deletedAt: string;
}

export interface DaySummary {
  day: DayKey;
  total: number;
  done: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

export const toDayKey = (d: Date): DayKey =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTime = (d: Date): string =>
  `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const monthOf = (day: DayKey): MonthKey => day.slice(0, 7);
export const yearOf = (day: DayKey): string => day.slice(0, 4);

export const isMonthKey = (s: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

/** Local midnight of a day key (avoids the UTC shift of `new Date("YYYY-MM-DD")`). */
export function parseDay(day: DayKey): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function shiftDay(day: DayKey, delta: number): DayKey {
  const d = parseDay(day);
  d.setDate(d.getDate() + delta);
  return toDayKey(d);
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

const TIME_PREFIX = /^(\d{1,2}):([0-5]\d)(?:\s*([ap])\.?m\.?)?\s+(.*)$/is;

/**
 * Leading time → `Task.time` (24h "HH:MM"; files show it 12-hour). Accepts "21:30 x", "9:30 pm x", "9:30PM x", "12:05 am x".
 * No valid prefix → text only.
 */
export function parseTimePrefix(input: string): {
  time?: string;
  text: string;
} {
  const trimmed = input.trim();
  const m = TIME_PREFIX.exec(trimmed);
  if (!m) return { text: trimmed };
  let hour = Number(m[1]);
  const meridiem = m[3]?.toLowerCase();
  if (meridiem) {
    if (hour < 1 || hour > 12) return { text: trimmed };
    hour = (hour % 12) + (meridiem === "p" ? 12 : 0);
  } else if (hour > 23) return { text: trimmed };
  return { time: `${pad(hour)}:${m[2]}`, text: m[4]!.trim() };
}

/** Stored "21:05" → display "9:05 PM". */
export function to12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h! % 12 || 12}:${pad(m!)} ${h! < 12 ? "AM" : "PM"}`;
}

/** Stable sort by time; tasks at the same minute keep insertion order. */
export const sortByTime = (tasks: Task[]): Task[] =>
  tasks
    .map((t, i) => [t, i] as const)
    .sort((a, b) => a[0].time.localeCompare(b[0].time) || a[1] - b[1])
    .map(([t]) => t);

const DAY_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const MONTH_FMT = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

/** "Sat, 10 Oct 2026" */
export const dayTitle = (day: DayKey) =>
  DAY_FMT.format(parseDay(day)).replace(/^(\w+) /, "$1, ");
/** "October 2026" */
export const monthTitle = (month: MonthKey) =>
  MONTH_FMT.format(parseDay(`${month}-01`));
