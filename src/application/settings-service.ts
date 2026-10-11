import type { Clock, Config, ConfigStore } from "../domain/ports";
import { toDayKey } from "../domain/task";

/** Data path changes. Every path ever used stays in history so old tasks can always be found. */
export class SettingsService {
  /** Config writes are read-modify-write; run them one at a time so fast key presses can't lose an update. */
  private queue: Promise<unknown> = Promise.resolve();
  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => {});
    return run;
  }

  constructor(
    private readonly store: ConfigStore,
    private readonly clock: Clock,
  ) {}

  get configLocation(): string {
    return this.store.location;
  }

  load(): Promise<Config> {
    return this.store.load();
  }

  changeDataDir(path: string): Promise<Config> {
    return this.serial(() => this.writeDataDir(path));
  }

  private async writeDataDir(path: string): Promise<Config> {
    if (!path.trim()) throw new Error("Path is empty");
    const next = this.store.normalize(path.trim());
    const config = await this.store.load();
    if (next === config.dataDir) return config;
    const today = toDayKey(this.clock.now());
    const updated: Config = {
      ...config,
      dataDir: next,
      dataDirSince: today,
      history: [
        ...config.history,
        { path: config.dataDir, from: config.dataDirSince, to: today },
      ],
    };
    await this.store.save(updated);
    return updated;
  }

  /** Picks a theme; the one it replaces becomes what the quick toggle returns to. */
  setTheme(theme: string): Promise<Config> {
    return this.serial(() => this.writeTheme(theme));
  }

  private async writeTheme(theme: string): Promise<Config> {
    const config = await this.store.load();
    const current = config.theme ?? "dark";
    if (theme === current) return config;
    const updated = { ...config, theme, previousTheme: current };
    await this.store.save(updated);
    return updated;
  }

  /** Swaps the current and previous theme (dark ↔ light until the user picks others). */
  toggleTheme(): Promise<Config> {
    return this.serial(async () => {
      const config = await this.store.load();
      const current = config.theme ?? "dark";
      const previous = config.previousTheme;
      return this.writeTheme(
        previous && previous !== current
          ? previous
          : current === "light"
            ? "dark"
            : "light",
      );
    });
  }
}
