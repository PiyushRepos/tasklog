import type { Clock, TaskRepository, TrashRepository } from "../domain/ports";
import {
  newId,
  parseTimePrefix,
  sortByTime,
  toTime,
  type DayKey,
  type DaySummary,
  type Task,
  type TrashedTask,
} from "../domain/task";

/** Task use cases. Every write re-reads the day first, so edits made to the files by hand are never clobbered. */
export class TaskService {
  private undoStack: string[] = [];

  constructor(
    private readonly tasks: TaskRepository,
    private readonly trash: TrashRepository,
    private readonly clock: Clock,
  ) {}

  readDay(day: DayKey): Promise<Task[]> {
    return this.tasks.readDay(day);
  }

  async summaries(): Promise<DaySummary[]> {
    const days = await this.tasks.listDays();
    return Promise.all(
      days.map(async (day) => {
        const list = await this.tasks.readDay(day);
        return {
          day,
          total: list.length,
          done: list.filter((t) => t.done).length,
        };
      }),
    );
  }

  /** `input` may start with "21:30 " or "9:30 pm " to set the time; otherwise the current time is used. */
  async add(day: DayKey, input: string): Promise<Task> {
    const { time, text } = parseTimePrefix(input);
    if (!text) throw new Error("Task text is empty");
    const task: Task = {
      id: newId(),
      day,
      time: time ?? toTime(this.clock.now()),
      text,
      done: false,
    };
    await this.tasks.writeDay(
      day,
      sortByTime([...(await this.tasks.readDay(day)), task]),
    );
    return task;
  }

  async edit(day: DayKey, id: string, input: string): Promise<Task> {
    const { time, text } = parseTimePrefix(input);
    if (!text) throw new Error("Task text is empty");
    return this.update(day, id, (t) => ({ ...t, text, time: time ?? t.time }));
  }

  toggle(day: DayKey, id: string): Promise<Task> {
    return this.update(day, id, (t) => ({ ...t, done: !t.done }));
  }

  /** Soft delete: the task moves to the trash and can be undone or restored. */
  async remove(day: DayKey, id: string): Promise<TrashedTask> {
    const list = await this.tasks.readDay(day);
    const task = findOrThrow(list, id);
    const trashed: TrashedTask = {
      ...task,
      deletedAt: this.clock.now().toISOString(),
    };
    // Trash first: if the second write fails the task exists twice, never zero times.
    await this.trash.add(trashed);
    await this.tasks.writeDay(
      day,
      list.filter((t) => t.id !== id),
    );
    this.undoStack.push(id);
    return trashed;
  }

  /** Restores the most recent delete of this session. */
  async undo(): Promise<Task | undefined> {
    while (this.undoStack.length) {
      const id = this.undoStack.pop()!;
      const restored = await this.restore(id).catch(() => undefined);
      if (restored) return restored;
    }
    return undefined;
  }

  listTrash(): Promise<TrashedTask[]> {
    return this.trash.list();
  }

  async restore(id: string): Promise<Task> {
    const trashed = (await this.trash.list()).find((t) => t.id === id);
    if (!trashed) throw new Error("Task is no longer in the trash");
    const { deletedAt: _, ...task } = trashed;
    await this.tasks.writeDay(
      task.day,
      sortByTime([...(await this.tasks.readDay(task.day)), task]),
    );
    await this.trash.remove(id);
    return task;
  }

  async purge(id: string): Promise<void> {
    await this.trash.remove(id);
  }

  private async update(
    day: DayKey,
    id: string,
    change: (t: Task) => Task,
  ): Promise<Task> {
    const list = await this.tasks.readDay(day);
    const updated = change(findOrThrow(list, id));
    await this.tasks.writeDay(
      day,
      sortByTime(list.map((t) => (t.id === id ? updated : t))),
    );
    return updated;
  }
}

function findOrThrow(list: Task[], id: string): Task {
  const task = list.find((t) => t.id === id);
  if (!task)
    throw new Error("Task not found (was the file edited outside tasklog?)");
  return task;
}
