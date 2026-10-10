import { dayDoc, monthDoc } from "../domain/format";
import type { TaskRepository } from "../domain/ports";
import { monthOf, type DayKey, type MonthKey } from "../domain/task";

export interface ExportResult {
  text: string;
  taskCount: number;
}

/** Builds shareable markdown for a day, month or year. */
export class ExportService {
  constructor(private readonly tasks: TaskRepository) {}

  async day(day: DayKey): Promise<ExportResult> {
    const tasks = await this.tasks.readDay(day);
    return {
      text: tasks.length ? dayDoc(day, tasks) : "",
      taskCount: tasks.length,
    };
  }

  async month(month: MonthKey): Promise<ExportResult> {
    return this.months([month], "#");
  }

  async year(year: string): Promise<ExportResult> {
    const months = [
      ...new Set(
        (await this.tasks.listDays())
          .filter((d) => d.startsWith(year))
          .map(monthOf),
      ),
    ];
    const result = await this.months(months, "##");
    return {
      ...result,
      text: result.taskCount ? `# ${year}\n\n${result.text}` : "",
    };
  }

  /** Accepts YYYY, YYYY-MM or YYYY-MM-DD. */
  async any(key: string): Promise<ExportResult> {
    if (/^\d{4}$/.test(key)) return this.year(key);
    if (/^\d{4}-\d{2}$/.test(key)) return this.month(key);
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return this.day(key);
    throw new Error(`Expected YYYY, YYYY-MM or YYYY-MM-DD, got "${key}"`);
  }

  private async months(
    months: MonthKey[],
    heading: string,
  ): Promise<ExportResult> {
    const days = await this.tasks.listDays();
    const parts: string[] = [];
    let taskCount = 0;
    for (const month of months) {
      const monthDays = await Promise.all(
        days
          .filter((d) => monthOf(d) === month)
          .map(async (day) => ({ day, tasks: await this.tasks.readDay(day) })),
      );
      const count = monthDays.reduce((n, d) => n + d.tasks.length, 0);
      if (!count) continue;
      taskCount += count;
      parts.push(monthDoc(month, monthDays, heading));
    }
    return { text: parts.join("\n"), taskCount };
  }
}
