import type { DayKey, Task, TrashedTask } from "./task";

/** Persistent store of tasks, one list per day. */
export interface TaskRepository {
  /** Days that have at least one task, ascending. */
  listDays(): Promise<DayKey[]>;
  readDay(day: DayKey): Promise<Task[]>;
  /** Replaces the day's tasks. An empty list removes the day. */
  writeDay(day: DayKey, tasks: Task[]): Promise<void>;
}

export interface TrashRepository {
  list(): Promise<TrashedTask[]>;
  add(task: TrashedTask): Promise<void>;
  remove(id: string): Promise<TrashedTask | undefined>;
}

export interface PathHistoryEntry {
  path: string;
  /** YYYY-MM-DD the path became active */
  from: string;
  /** YYYY-MM-DD the path was replaced */
  to: string;
}

export interface Config {
  dataDir: string;
  dataDirSince: string;
  history: PathHistoryEntry[];
  /** Active theme: "dark", "light" or a name from `themes`. */
  theme?: string;
  /** What the quick toggle (m / ctrl+t) switches back to. */
  previousTheme?: string;
  /** User themes: { name: { base?: "dark" | "light", bg?: "#rrggbb", … } }. Validated by the UI. */
  themes?: Record<string, unknown>;
}

export interface ConfigStore {
  /** Where the config lives, shown to the user. */
  readonly location: string;
  /** Turns user input ("~/notes", relative paths) into the canonical stored form. */
  normalize(path: string): string;
  load(): Promise<Config>;
  save(config: Config): Promise<void>;
}

export interface Clipboard {
  /** Resolves true when the text reached the system or terminal clipboard. */
  copy(text: string): Promise<boolean>;
}

export interface Clock {
  now(): Date;
}
