import { expect, test } from "bun:test";
import {
  formatDayFile,
  formatTrashFile,
  parseDayFile,
  parseTrashFile,
} from "../src/infrastructure/markdown/day-codec";

const DAY = "2026-10-10";

test("round-trips tasks with ids", () => {
  const tasks = [
    { id: "a1", day: DAY, time: "09:14", text: "Fix login bug", done: false },
    { id: "b2", day: DAY, time: "11:02", text: "Review PR #12", done: true },
  ];
  const content = formatDayFile(DAY, { tasks, extra: [] });
  expect(content).toBe(
    "# Sat, 10 Oct 2026\n\n- [ ] 9:14 AM Fix login bug <!-- id:a1 -->\n- [x] 11:02 AM Review PR #12 <!-- id:b2 -->\n",
  );
  expect(parseDayFile(content, DAY)).toEqual({ tasks, extra: [] });
});

test("hand-written lines get stable ids and keep notes", () => {
  const content =
    "# whatever\n\n- [ ] 9:05 standup\n- [X] no time here\nsome note\n## Later\n";
  const a = parseDayFile(content, DAY);
  const b = parseDayFile(content, DAY);
  expect(a.tasks.map((t) => [t.time, t.text, t.done])).toEqual([
    ["09:05", "standup", false],
    ["00:00", "no time here", true],
  ]);
  expect(a.tasks.map((t) => t.id)).toEqual(b.tasks.map((t) => t.id));
  expect(a.extra).toEqual(["some note", "## Later"]);
  expect(formatDayFile(DAY, a)).toContain("\n\nsome note\n## Later\n");
});

test("trash keeps origin day and deletion time", () => {
  const items = [
    {
      id: "x",
      day: DAY,
      time: "08:00",
      text: "gone",
      done: false,
      deletedAt: "2026-10-10T12:00:00.000Z",
    },
  ];
  expect(parseTrashFile(formatTrashFile(items))).toEqual(items);
});

test("reads both 12-hour and older 24-hour times", () => {
  const { tasks } = parseDayFile(
    "- [x] 9:30 PM late <!-- id:a -->\n- [ ] 21:30 old <!-- id:b -->\n- [ ] 12:05 am night <!-- id:c -->\n",
    DAY,
  );
  expect(tasks.map((t) => [t.time, t.text])).toEqual([
    ["21:30", "late"],
    ["21:30", "old"],
    ["00:05", "night"],
  ]);
});
