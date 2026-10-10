import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { TaskRepository } from "../../domain/ports";
import { isMonthKey, monthOf, type DayKey, type Task } from "../../domain/task";
import { atomicWrite, isNotFound, readIfExists } from "../fs/files";
import { formatDayFile, parseDayFile } from "./day-codec";
import type { MonthIndexWriter } from "./month-index-writer";

const DAY_FILE = /^(\d{4}-\d{2}-\d{2})\.md$/;

/** Tasks stored as `<root>/YYYY-MM/YYYY-MM-DD.md`. Folders are created on the first task of a month. */
export class MarkdownTaskRepository implements TaskRepository {
  constructor(
    private readonly root: string,
    private readonly index: MonthIndexWriter,
  ) {}

  private dayPath(day: DayKey) {
    return join(this.root, monthOf(day), `${day}.md`);
  }

  async listDays(): Promise<DayKey[]> {
    const months = (await readdirOrEmpty(this.root)).filter(isMonthKey);
    const days = await Promise.all(
      months.map(async (m) =>
        (await readdirOrEmpty(join(this.root, m)))
          .map((n) => DAY_FILE.exec(n)?.[1])
          .filter((d): d is string => !!d && monthOf(d) === m),
      ),
    );
    return days.flat().sort();
  }

  async readDay(day: DayKey): Promise<Task[]> {
    const content = await readIfExists(this.dayPath(day));
    return content === undefined ? [] : parseDayFile(content, day).tasks;
  }

  async writeDay(day: DayKey, tasks: Task[]): Promise<void> {
    const path = this.dayPath(day);
    const existing = await readIfExists(path);
    const extra =
      existing === undefined ? [] : parseDayFile(existing, day).extra;
    if (!tasks.length && !extra.length) await rm(path, { force: true });
    else await atomicWrite(path, formatDayFile(day, { tasks, extra }));
    await this.index.rebuild(monthOf(day));
  }
}

async function readdirOrEmpty(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch (e) {
    if (isNotFound(e)) return [];
    throw e;
  }
}
