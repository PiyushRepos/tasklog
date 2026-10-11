import { testRender } from "@opentui/react/test-utils";
import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createDataServices,
  createSettingsService,
} from "../src/cli/container";
import { JsonConfigStore } from "../src/infrastructure/config/json-config-store";
import { App } from "../src/ui/app";
import { fixedClock } from "./fakes";

test("type a task, toggle it, delete and undo", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tasklog-ui-"));
  const clock = fixedClock();
  const copied: string[] = [];
  const setup = await testRender(
    <App
      initial={createDataServices(dir, clock)}
      settings={createSettingsService(
        new JsonConfigStore(join(dir, ".cfg"), clock),
        clock,
      )}
      clipboard={{ copy: async (t) => (copied.push(t), true) }}
      clock={clock}
      openDataDir={(d) => createDataServices(d, clock)}
      displayPath={(p) => p}
    />,
    { width: 100, height: 26 },
  );
  // Updates come from async file I/O, not act(); turn off React's act() warnings for this real-I/O test.
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = false;
  const keys = setup.mockInput;
  // App work is async file I/O, which the renderer's own wait helpers cannot see; poll frames instead.
  const frame = async (text: string) => {
    for (let i = 0; i < 100; i++) {
      await setup.renderOnce();
      // Compare with runs of spaces collapsed, so layout spacing changes don't break assertions.
      if (
        setup
          .captureCharFrame()
          .replace(/ +/g, " ")
          .includes(text.replace(/ +/g, " "))
      )
        return;
      await Bun.sleep(10);
    }
    throw new Error(
      `Frame never showed "${text}":\n${setup.captureCharFrame()}`,
    );
  };
  try {
    // Launch lands in add mode on today: typing works immediately.
    await frame("What are you working on?");
    // ctrl+t switches theme even while typing, and doesn't type a "t"
    keys.pressKey("t", { ctrl: true });
    await Bun.sleep(50);
    expect(readFileSync(join(dir, ".cfg", "config.json"), "utf8")).toContain(
      '"theme": "light"',
    );
    keys.pressKey("t", { ctrl: true }); // back to dark for the rest of the test
    await keys.typeText("09:05 Write the plan");
    keys.pressEnter();
    await frame("□ 9:05 AM Write the plan");
    expect(
      readFileSync(join(dir, "2026-10", "2026-10-10.md"), "utf8"),
    ).toContain("- [ ] 9:05 AM Write the plan");

    keys.pressEnter(); // empty enter leaves add mode
    await frame("PRESS A TO ADD A TASK");

    await keys.typeText(" ");
    await frame("1 OF 1 DONE");
    expect(readFileSync(join(dir, "2026-10", "index.md"), "utf8")).toContain(
      "- [x] 9:05 AM Write the plan",
    );

    await keys.typeText("C");
    await frame("Copied October 2026");
    expect(copied[0]).toContain("# October 2026");

    await keys.typeText("d"); // starts a cancellable delete
    keys.pressEscape();
    await frame("Kept");
    await keys.typeText("dd"); // second d deletes at once
    await frame("u to undo");
    await keys.typeText("u");
    await frame("Restored");
    await frame("■ 9:05 AM Write the plan");

    // "a" opens the input without leaking into it; a time prefix sorts the new task first.
    await keys.typeText("a");
    await frame("What are you working on?");
    await keys.typeText("8:00 am Coffee");
    keys.pressEnter();
    await frame("□ 8:00 AM Coffee");
    keys.pressEscape();
    await frame("PRESS A TO ADD A TASK");
    const day = readFileSync(join(dir, "2026-10", "2026-10-10.md"), "utf8");
    expect(day.indexOf("8:00 AM Coffee")).toBeGreaterThan(0);
    expect(day.indexOf("8:00 AM Coffee")).toBeLessThan(
      day.indexOf("9:05 AM Write the plan"),
    );

    // Edit the selected task in place.
    await keys.typeText("e");
    await frame("EDIT 8:00 AM");
    for (let i = 0; i < "Coffee".length; i++) keys.pressBackspace();
    await keys.typeText("Tea");
    keys.pressEnter();
    await frame("□ 8:00 AM Tea");

    // Search across days and jump back.
    await keys.typeText("/");
    await frame("SEARCH EVERY DAY");
    await keys.typeText("plan");
    await frame("MATCH · 1 DAY");
    keys.pressEnter();
    await frame("■ TASKS");
  } finally {
    setup.renderer.destroy();
  }
});
