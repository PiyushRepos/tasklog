import type { TaskRepository } from "../domain/ports";
import { to12h, type Task } from "../domain/task";

export interface ParsedQuery {
  /** Day-key prefixes ("2026", "2026-10", "2026-10-10"); a task matches if any prefix matches. */
  dates: string[];
  /** Lowercased words; a task matches only if its text contains all of them. */
  terms: string[];
}

const DATE_TOKEN = /^\d{4}(-\d{2}(-\d{2})?)?$/;

export function parseQuery(query: string): ParsedQuery {
  const dates: string[] = [];
  const terms: string[] = [];
  for (const token of query.trim().split(/\s+/).filter(Boolean)) {
    if (DATE_TOKEN.test(token)) dates.push(token);
    else terms.push(token.toLowerCase());
  }
  return { dates, terms };
}

export function matches(task: Task, q: ParsedQuery): boolean {
  if (q.dates.length && !q.dates.some((d) => task.day.startsWith(d)))
    return false;
  const text = `${task.time} ${to12h(task.time)} ${task.text}`.toLowerCase();
  return q.terms.every((t) => text.includes(t));
}

export class SearchService {
  constructor(private readonly tasks: TaskRepository) {}

  /** Newest first. An empty query returns nothing. */
  async search(query: string, limit = 500): Promise<Task[]> {
    const q = parseQuery(query);
    if (!q.dates.length && !q.terms.length) return [];
    const days = (await this.tasks.listDays())
      .filter(
        (day) => !q.dates.length || q.dates.some((d) => day.startsWith(d)),
      )
      .reverse();
    const results: Task[] = [];
    for (const day of days) {
      const hits = (await this.tasks.readDay(day))
        .filter((t) => matches(t, q))
        .reverse();
      results.push(...hits);
      if (results.length >= limit) return results.slice(0, limit);
    }
    return results;
  }
}
