import type {
  Clock,
  TaskRepository,
  TrashRepository,
} from "../src/domain/ports";
import type { DayKey, Task, TrashedTask } from "../src/domain/task";

export class InMemoryTaskRepository implements TaskRepository {
  days = new Map<DayKey, Task[]>();
  async listDays() {
    return [...this.days.keys()].sort();
  }
  async readDay(day: DayKey) {
    return [...(this.days.get(day) ?? [])];
  }
  async writeDay(day: DayKey, tasks: Task[]) {
    if (tasks.length) this.days.set(day, [...tasks]);
    else this.days.delete(day);
  }
}

export class InMemoryTrashRepository implements TrashRepository {
  items: TrashedTask[] = [];
  async list() {
    return [...this.items];
  }
  async add(t: TrashedTask) {
    this.items.push(t);
  }
  async remove(id: string) {
    const found = this.items.find((t) => t.id === id);
    this.items = this.items.filter((t) => t.id !== id);
    return found;
  }
}

export const fixedClock = (iso = "2026-10-10T14:30:00"): Clock => ({
  now: () => new Date(iso),
});
