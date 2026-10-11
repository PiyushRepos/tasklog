import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createDataServices,
  createSettingsService,
} from "../src/cli/container";
import { JsonConfigStore } from "../src/infrastructure/config/json-config-store";
import { fixedClock } from "./fakes";

const tmp = () => mkdtempSync(join(tmpdir(), "tasklog-test-"));

test("first task creates the month folder, day file and index; last delete cleans up", async () => {
  const dir = tmp();
  const { tasks, exporter } = createDataServices(dir, fixedClock());
  const a = await tasks.add("2026-10-10", "09:14 Fix login bug");
  await tasks.add("2026-10-11", "Ship it");

  const dayFile = readFileSync(join(dir, "2026-10", "2026-10-10.md"), "utf8");
  expect(dayFile).toBe(
    `# Sat, 10 Oct 2026\n\n- [ ] 9:14 AM Fix login bug <!-- id:${a.id} -->\n`,
  );

  const index = readFileSync(join(dir, "2026-10", "index.md"), "utf8");
  expect(index).toStartWith("# October 2026\n");
  expect(index).toContain(
    "## Sat, 10 Oct 2026\n\n- [ ] 9:14 AM Fix login bug\n",
  );
  expect(index).toContain("## Sun, 11 Oct 2026\n\n- [ ] 2:30 PM Ship it\n");
  expect(index).not.toContain("id:");

  expect((await exporter.any("2026")).taskCount).toBe(2);
  expect((await exporter.any("2026-10")).text).toContain("Fix login bug");

  for (const day of ["2026-10-10", "2026-10-11"]) {
    for (const t of await tasks.readDay(day)) await tasks.remove(day, t.id);
  }
  expect(existsSync(join(dir, "2026-10"))).toBe(false);
  expect(readFileSync(join(dir, ".trash.md"), "utf8")).toContain(
    "day:2026-10-10",
  );

  await tasks.undo();
  expect((await tasks.readDay("2026-10-11")).map((t) => t.text)).toEqual([
    "Ship it",
  ]);
});

test("changing the data dir records the old path in history", async () => {
  const cfgDir = tmp();
  const settings = createSettingsService(
    new JsonConfigStore(cfgDir, fixedClock()),
    fixedClock(),
  );
  const first = await settings.load();
  const updated = await settings.changeDataDir("/tmp/elsewhere");
  expect(updated.dataDir).toBe("/tmp/elsewhere");
  expect(updated.history).toEqual([
    { path: first.dataDir, from: "2026-10-10", to: "2026-10-10" },
  ]);
  expect(
    JSON.parse(readFileSync(join(cfgDir, "config.json"), "utf8")).dataDir,
  ).toBe("/tmp/elsewhere");
});

test("theme is saved and survives a data dir change", async () => {
  const cfgDir = tmp();
  const settings = createSettingsService(
    new JsonConfigStore(cfgDir, fixedClock()),
    fixedClock(),
  );
  await settings.setTheme("light");
  await settings.changeDataDir("/tmp/elsewhere");
  expect((await settings.load()).theme).toBe("light");
});

test("toggle swaps between the picked theme and the one before it", async () => {
  const settings = createSettingsService(
    new JsonConfigStore(tmp(), fixedClock()),
    fixedClock(),
  );
  expect((await settings.toggleTheme()).theme).toBe("light"); // default dark → light
  await settings.setTheme("sepia");
  expect((await settings.toggleTheme()).theme).toBe("light");
  expect((await settings.toggleTheme()).theme).toBe("sepia");
});
