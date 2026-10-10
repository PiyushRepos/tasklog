#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { parseArgs } from "node:util";
import pkg from "../../package.json";
import { OpenTuiClipboard } from "../infrastructure/clipboard/opentui-clipboard";
import {
  defaultConfigDir,
  JsonConfigStore,
} from "../infrastructure/config/json-config-store";
import { expandPath, tildify } from "../infrastructure/fs/files";
import { systemClock } from "../infrastructure/system-clock";
import { App } from "../ui/app";
import { applyTheme, color } from "../ui/design/tokens";
import { HELP, runCommand } from "./commands";
import { createDataServices, createSettingsService } from "./container";

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      dir: { type: "string" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
    allowPositionals: true,
  });
  if (values.help) return console.log(HELP);
  if (values.version) return console.log(pkg.version);

  const clock = systemClock;
  const settings = createSettingsService(
    new JsonConfigStore(defaultConfigDir(), clock),
    clock,
  );
  const config = await settings.load();
  const openDataDir = (dir: string) => createDataServices(dir, clock);
  const data = openDataDir(
    values.dir ? expandPath(values.dir) : config.dataDir,
  );

  if (await runCommand(positionals, data, settings, clock)) return;
  if (!process.stdin.isTTY)
    throw new Error(
      "tasklog needs an interactive terminal. Use `tasklog add` or `tasklog export` in scripts.",
    );

  applyTheme(config.theme ?? "dark");
  let clipboard: OpenTuiClipboard | undefined;
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    screenMode: "alternate-screen",
    backgroundColor: color.bg,
    useMouse: true,
    onDestroy: () => {
      void clipboard?.dispose().finally(() => process.exit(0));
      if (!clipboard) process.exit(0);
    },
  });
  clipboard = new OpenTuiClipboard(renderer);
  createRoot(renderer).render(
    <App
      initial={data}
      settings={settings}
      clipboard={clipboard}
      clock={clock}
      openDataDir={openDataDir}
      displayPath={tildify}
      initialTheme={config.theme ?? "dark"}
    />,
  );
}

main().catch((e: Error) => {
  console.error(`tasklog: ${e.message}`);
  process.exit(1);
});
