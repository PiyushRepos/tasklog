import { expect, test } from "bun:test";
import { TaskService } from "../src/application/task-service";
import {
  fixedClock,
  InMemoryTaskRepository,
  InMemoryTrashRepository,
} from "./fakes";

const DAY = "2026-10-10";
const setup = () => {
  const repo = new InMemoryTaskRepository();
  const trash = new InMemoryTrashRepository();
  return { repo, trash, svc: new TaskService(repo, trash, fixedClock()) };
};

test("add uses the clock or a HH:MM prefix and keeps the day sorted", async () => {
  const { svc } = setup();
  await svc.add(DAY, "later thing");
  await svc.add(DAY, "9:05 standup");
  expect((await svc.readDay(DAY)).map((t) => `${t.time} ${t.text}`)).toEqual([
    "09:05 standup",
    "14:30 later thing",
  ]);
  expect(svc.add(DAY, "   ")).rejects.toThrow("empty");
});

test("12-hour input and display", async () => {
  const { parseTimePrefix, to12h } = await import("../src/domain/task");
  expect(parseTimePrefix("9:30 pm call")).toEqual({
    time: "21:30",
    text: "call",
  });
  expect(parseTimePrefix("12:05AM late")).toEqual({
    time: "00:05",
    text: "late",
  });
  expect(parseTimePrefix("12:15 p.m. lunch")).toEqual({
    time: "12:15",
    text: "lunch",
  });
  expect(parseTimePrefix("13:00 pm nope")).toEqual({ text: "13:00 pm nope" });
  expect(parseTimePrefix("04:64 bad minutes")).toEqual({
    text: "04:64 bad minutes",
  });
  expect(["00:05", "09:05", "12:00", "21:30"].map(to12h)).toEqual([
    "12:05 AM",
    "9:05 AM",
    "12:00 PM",
    "9:30 PM",
  ]);
});

test("edit, toggle and summaries", async () => {
  const { svc } = setup();
  const t = await svc.add(DAY, "draft");
  await svc.edit(DAY, t.id, "08:00 final");
  await svc.toggle(DAY, t.id);
  expect(await svc.readDay(DAY)).toEqual([
    { ...t, time: "08:00", text: "final", done: true },
  ]);
  expect(await svc.summaries()).toEqual([{ day: DAY, total: 1, done: 1 }]);
});

test("delete goes to trash; undo, restore and purge", async () => {
  const { svc, trash } = setup();
  const a = await svc.add(DAY, "08:00 a");
  const b = await svc.add(DAY, "09:00 b");
  await svc.remove(DAY, a.id);
  await svc.remove(DAY, b.id);
  expect(await svc.readDay(DAY)).toEqual([]);
  expect(trash.items.map((t) => t.id)).toEqual([a.id, b.id]);

  expect((await svc.undo())?.id).toBe(b.id);
  await svc.restore(a.id);
  expect((await svc.readDay(DAY)).map((t) => t.text)).toEqual(["a", "b"]);
  expect(await svc.undo()).toBeUndefined();

  await svc.remove(DAY, a.id);
  await svc.purge(a.id);
  expect(trash.items).toEqual([]);
  expect(await svc.undo()).toBeUndefined();
});
