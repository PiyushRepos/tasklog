import type { Clock, Config, ConfigStore } from "../domain/ports";
import { toDayKey } from "../domain/task";

/** Data path changes. Every path ever used stays in history so old tasks can always be found. */
export class SettingsService {
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

  async changeDataDir(path: string): Promise<Config> {
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

  async setTheme(theme: NonNullable<Config["theme"]>): Promise<void> {
    await this.store.save({ ...(await this.store.load()), theme });
  }
}
