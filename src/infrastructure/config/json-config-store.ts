import { homedir } from "node:os";
import { join } from "node:path";
import type { Clock, Config, ConfigStore } from "../../domain/ports";
import { toDayKey } from "../../domain/task";
import { atomicWrite, expandPath, readIfExists } from "../fs/files";

/** `$TASKLOG_CONFIG_DIR`, else `%APPDATA%\tasklog` on Windows, else `$XDG_CONFIG_HOME/tasklog` or `~/.config/tasklog`. */
export function defaultConfigDir(env = process.env): string {
  if (env.TASKLOG_CONFIG_DIR) return expandPath(env.TASKLOG_CONFIG_DIR);
  if (process.platform === "win32" && env.APPDATA)
    return join(env.APPDATA, "tasklog");
  return join(env.XDG_CONFIG_HOME || join(homedir(), ".config"), "tasklog");
}

export class JsonConfigStore implements ConfigStore {
  readonly location: string;

  constructor(
    configDir: string,
    private readonly clock: Clock,
  ) {
    this.location = join(configDir, "config.json");
  }

  normalize(path: string): string {
    return expandPath(path);
  }

  async load(): Promise<Config> {
    const raw = await readIfExists(this.location);
    if (raw === undefined) {
      return {
        dataDir: join(homedir(), "tasklog"),
        dataDirSince: toDayKey(this.clock.now()),
        history: [],
      };
    }
    let parsed: Partial<Config>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Refuse to continue rather than overwrite the user's path history with defaults.
      throw new Error(`Config file is not valid JSON: ${this.location}`);
    }
    if (typeof parsed.dataDir !== "string")
      throw new Error(`Config file has no "dataDir": ${this.location}`);
    return {
      dataDir: expandPath(parsed.dataDir),
      dataDirSince: parsed.dataDirSince ?? toDayKey(this.clock.now()),
      history: Array.isArray(parsed.history) ? parsed.history : [],
      // Kept as written (not sanitised) so saving never drops the user's theme edits.
      ...(typeof parsed.theme === "string" ? { theme: parsed.theme } : {}),
      ...(typeof parsed.previousTheme === "string"
        ? { previousTheme: parsed.previousTheme }
        : {}),
      ...(parsed.themes && typeof parsed.themes === "object"
        ? { themes: parsed.themes }
        : {}),
    };
  }

  async save(config: Config): Promise<void> {
    await atomicWrite(this.location, JSON.stringify(config, null, 2) + "\n");
  }
}
