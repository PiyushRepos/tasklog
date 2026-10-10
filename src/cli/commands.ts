import type { SettingsService } from "../application/settings-service";
import type { Clock } from "../domain/ports";
import { to12h, toDayKey } from "../domain/task";
import { tildify } from "../infrastructure/fs/files";
import type { DataServices } from "../ui/services-context";

export const HELP = `tasklog — keyboard-first daily task log

Usage
  tasklog                      open the app
  tasklog add <text...>        log a task for today ("9:30 am text" or "21:30 text" sets the time)
  tasklog export [period]      print markdown for YYYY, YYYY-MM (default: this month) or YYYY-MM-DD
  tasklog where                show the data folder, config file and previous folders

Options
  --dir <path>                 use this data folder for this run only
  -h, --help                   show this help
  -v, --version                show the version

Tasks are stored as <data folder>/YYYY-MM/YYYY-MM-DD.md, with a generated index.md per month.`;

/** Non-interactive subcommands. Returns false when the args ask for the TUI. */
export async function runCommand(
  args: string[],
  data: DataServices,
  settings: SettingsService,
  clock: Clock,
): Promise<boolean> {
  const [cmd, ...rest] = args;
  if (cmd === "add") {
    const task = await data.tasks.add(toDayKey(clock.now()), rest.join(" "));
    console.log(`Logged ${task.day} ${to12h(task.time)}  ${task.text}`);
    return true;
  }
  if (cmd === "export") {
    const result = await data.exporter.any(
      rest[0] ?? toDayKey(clock.now()).slice(0, 7),
    );
    if (!result.taskCount) {
      console.error("No tasks in that period.");
      process.exitCode = 1;
    } else process.stdout.write(result.text);
    return true;
  }
  if (cmd === "where") {
    const config = await settings.load();
    console.log(`Data folder:  ${tildify(data.dataDir)}`);
    console.log(`Config file:  ${tildify(settings.configLocation)}`);
    for (const h of config.history)
      console.log(`Previously:   ${tildify(h.path)}  (${h.from} → ${h.to})`);
    return true;
  }
  if (cmd !== undefined)
    throw new Error(`Unknown command "${cmd}". Run tasklog --help.`);
  return false;
}
