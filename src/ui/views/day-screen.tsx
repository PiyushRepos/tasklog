import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { dayDoc } from "../../domain/format";
import {
  dayTitle,
  monthOf,
  monthTitle,
  shiftDay,
  to12h,
  toDayKey,
  type DayKey,
  type Task,
} from "../../domain/task";
import type { Screen } from "../app";
import {
  color,
  Empty,
  Grid,
  InputField,
  Label,
  ListRow,
  Meter,
  size,
  StatusLine,
  Value,
  type GridRow,
  type Hint,
} from "../design";
import { easeOut, motion, useProgress } from "../design/motion";
import { char, clamp, isDown, isUp, windowStart } from "../hooks/keys";
import { useCopy } from "../hooks/use-copy";
import { useLibrary } from "../hooks/use-library";
import { useNow } from "../hooks/use-now";
import { usePending } from "../hooks/use-pending";
import { useApp } from "../services-context";
import { buildRows, Sidebar } from "./sidebar";

type InputMode =
  { kind: "none" } | { kind: "add" } | { kind: "edit"; task: Task };

interface DayScreenProps {
  day: DayKey;
  onDayChange(day: DayKey): void;
  /** Select this task once the day has loaded (after a search jump or undo). */
  focusTaskId?: string;
  startAdding: boolean;
  onOpen(screen: Screen): void;
}

const BROWSE_HINTS: Hint[] = [
  ["A", "add"],
  ["E", "edit"],
  ["␣", "done"],
  ["D", "delete"],
  ["/", "search"],
  ["Y", "copy task"],
  ["⇧C", "copy month"],
  ["?", "all keys"],
];

/** Faint dotted rule between tasks, sized exactly to the cell so it never overflows. */
const TaskDivider = ({ width }: { width: number }) => (
  <text height={1} flexShrink={0} wrapMode="none" fg={color.line}>
    {"  " + "┈".repeat(Math.max(0, width - 2))}
  </text>
);

const shortDay = (day: DayKey) =>
  dayTitle(day)
    .replace(/ \d{4}$/, "")
    .toUpperCase();

export function DayScreen({
  day,
  onDayChange,
  focusTaskId,
  startAdding,
  onOpen,
}: DayScreenProps) {
  const app = useApp();
  const copy = useCopy();
  const { width, height } = useTerminalDimensions();
  const now = useNow(app.clock);
  const today = toDayKey(now);
  const { summaries, tasks, reload } = useLibrary(day);
  const [index, setIndex] = useState(0);
  const [focus, setFocus] = useState<"days" | "tasks">("tasks");
  const [input, setInput] = useState<InputMode>(
    startAdding ? { kind: "add" } : { kind: "none" },
  );
  const [resetKey, setResetKey] = useState(0);

  const rows = useMemo(
    () => buildRows(summaries, [today, day]),
    [summaries, today, day],
  );
  const dayKeys = useMemo(
    () => rows.flatMap((r) => (r.kind === "day" ? [r.day] : [])),
    [rows],
  );
  const selected = clamp(index, 0, Math.max(0, tasks.length - 1));
  const current: Task | undefined = tasks[selected];

  const showStats = height >= size.statRowMinHeight;
  const showSidebar = width >= size.sidebarMinWidth;
  const fixedRows = (showStats ? 4 : 0) + 1 + 1 + (showStats ? 5 : 4); // stat + input + keys + rules
  const listHeight = Math.max(1, height - fixedRows - 1); // minus the cell label

  // Green sweep across a task that just came back (undo, restore) or was opened from search.
  const [pulse, setPulse] = useState<{ id: string } | null>(null);
  const pulseT = useProgress(pulse, motion.rowArriveMs);
  const arrive = (id: string) => setPulse({ id });

  // Pending delete: a red fill runs across the row; esc/u cancels, d again (or the fill finishing) commits.
  const deleting = usePending<Task>(motion.deleteWindowMs);
  const startDelete = (task: Task) =>
    deleting.start(task, () =>
      app.services.tasks
        .remove(task.day, task.id)
        .then(() => reload())
        .then(() =>
          app.toast(`Deleted “${task.text}” · u to undo · T for trash`, "warn"),
        )
        .catch(fail),
    );
  const cancelDelete = () => {
    const task = deleting.cancel();
    if (task) app.toast(`Kept “${task.text}”`, "info");
  };

  useEffect(() => {
    if (focusTaskId) arrive(focusTaskId);
  }, [focusTaskId]);

  useEffect(() => {
    if (!focusTaskId) return;
    const i = tasks.findIndex((t) => t.id === focusTaskId);
    if (i >= 0) setIndex(i);
  }, [tasks, focusTaskId]);

  const fail = (e: Error) => app.toast(e.message, "danger");
  const changeDay = (next: DayKey) => {
    setIndex(0);
    onDayChange(next);
  };
  const selectTask = async (id: string) => {
    const list = await reload();
    setIndex(
      Math.max(
        0,
        list.findIndex((t) => t.id === id),
      ),
    );
  };

  const submit = (value: string) => {
    if (input.kind === "add") {
      if (!value.trim()) return setInput({ kind: "none" }); // Enter on an empty line leaves add mode
      app.services.tasks
        .add(day, value)
        .then((t) => selectTask(t.id))
        .then(() => setResetKey((k) => k + 1))
        .catch(fail);
    } else if (input.kind === "edit") {
      const id = input.task.id;
      setInput({ kind: "none" }); // close at once so the next key goes to the list, not the input
      app.services.tasks
        .edit(day, id, value)
        .then(() => selectTask(id))
        .catch(fail);
    }
  };

  const undo = () =>
    app.services.tasks
      .undo()
      .then(async (t) => {
        if (!t) return app.toast("Nothing to undo", "warn");
        app.toast(`Restored “${t.text}”`, "success");
        if (t.day !== day) onDayChange(t.day);
        else await selectTask(t.id);
        arrive(t.id);
      })
      .catch(fail);

  useKeyboard((key) => {
    if (input.kind !== "none") {
      if (key.name === "escape") setInput({ kind: "none" });
      return;
    }
    const c = char(key);
    if (deleting.isActive()) {
      if (key.name === "escape" || c === "u") return cancelDelete();
      if (c === "d" || key.name === "delete") return deleting.commit();
      if (c === "q") return deleting.commit().finally(app.quit); // let the write land before exiting
      deleting.commit(); // any other key: finish the delete now, then handle the key
    }
    if (c === "q") return app.quit();
    if (
      c === "a" ||
      c === "i" ||
      c === "o" ||
      (key.name === "return" && (focus === "days" || !current))
    ) {
      setResetKey((k) => k + 1);
      return setInput({ kind: "add" });
    }
    if (
      key.name === "tab" ||
      key.name === "left" ||
      key.name === "right" ||
      c === "h" ||
      c === "l"
    ) {
      return setFocus(
        key.name === "left" || c === "h"
          ? "days"
          : key.name === "right" || c === "l"
            ? "tasks"
            : focus === "days"
              ? "tasks"
              : "days",
      );
    }
    if (isUp(key) || isDown(key)) {
      const delta = isUp(key) ? -1 : 1;
      if (focus === "tasks" || !showSidebar)
        return setIndex(
          clamp(selected + delta, 0, Math.max(0, tasks.length - 1)),
        );
      const i = dayKeys.indexOf(day);
      const next = dayKeys[clamp(i + delta, 0, dayKeys.length - 1)];
      return next && next !== day && changeDay(next);
    }
    if (c === "[" || c === "]")
      return changeDay(shiftDay(day, c === "[" ? -1 : 1));
    if (c === "t") return changeDay(today);
    if (c === "/") return onOpen("search");
    if (c === "T") return onOpen("trash");
    if (c === "s") return onOpen("settings");
    if (c === "?") return onOpen("help");
    if (c === "u") return undo();
    if (c === "m") return app.toggleTheme();
    if (c === "c") return copy("day", day).catch(fail);
    if (c === "C") return copy("month", day).catch(fail);
    if (c === "Y") return copy("year", day).catch(fail);
    if (!current) return;
    if (c === "y") {
      return app.clipboard
        .copy(dayDoc(day, [current])) // same markdown as copying a day, with just this task
        .then((ok) =>
          app.toast(
            ok ? `Copied “${current.text}”` : "Clipboard unavailable here",
            ok ? "success" : "warn",
          ),
        )
        .catch(fail);
    }
    if (c === "e" || key.name === "return") {
      setResetKey((k) => k + 1);
      return setInput({ kind: "edit", task: current });
    }
    if (key.name === "space" || c === " " || c === "x") {
      return app.services.tasks
        .toggle(day, current.id)
        .then(() => reload())
        .catch(fail);
    }
    if (c === "d" || key.name === "delete") return startDelete(current);
  });

  const doneCount = tasks.filter((t) => t.done).length;
  const monthSummaries = summaries.filter(
    (s) => monthOf(s.day) === monthOf(day),
  );
  const monthTasks = monthSummaries.reduce((n, s) => n + s.total, 0);
  const editing = input.kind === "edit" ? input.task : undefined;
  const tasksFocused =
    input.kind === "none" && (focus === "tasks" || !showSidebar);
  const taskGap = 1; // one faint divider line between tasks
  const visibleTasks = Math.max(
    1,
    Math.floor((listHeight - 1 + taskGap) / (1 + taskGap)), // -1: gap under the label
  );
  const start = windowStart(selected, tasks.length, visibleTasks);
  const hints: Hint[] =
    input.kind === "add"
      ? [
          ["↵", "save"],
          ["9:30 PM", "set time"],
          ["ESC", "stop adding"],
        ]
      : input.kind === "edit"
        ? [
            ["↵", "save"],
            ["ESC", "cancel"],
          ]
        : deleting.value
          ? [
              ["ESC", "cancel delete"],
              ["D", "delete now"],
            ]
          : BROWSE_HINTS;

  const gridRows: GridRow[] = [];
  if (showStats) {
    gridRows.push({
      key: "stats",
      height: 4,
      cells: [
        {
          key: "today",
          width: size.sideColumn,
          content: (
            <box flexDirection="column">
              <Label>Today</Label>
              <Value>{dayTitle(today).toUpperCase()}</Value>
            </box>
          ),
        },
        {
          key: "progress",
          content: (inner) => (
            <box
              flexGrow={1}
              flexDirection="column"
              justifyContent="space-between"
            >
              <Label>{`Progress · ${shortDay(day)}`}</Label>
              <box flexDirection="column">
                <Meter width={inner} value={doneCount} total={tasks.length} />
                <box flexDirection="row" justifyContent="space-between">
                  <Value>
                    {tasks.length
                      ? `${doneCount} OF ${tasks.length} DONE`
                      : "NO TASKS YET"}
                  </Value>
                  <Value bold>
                    {tasks.length
                      ? `${Math.round((doneCount / tasks.length) * 100)}%`
                      : ""}
                  </Value>
                </box>
              </box>
            </box>
          ),
        },
        {
          key: "month",
          width: size.statColumn,
          content: (
            <box
              flexGrow={1}
              flexDirection="column"
              justifyContent="space-between"
            >
              <Label>{monthTitle(monthOf(day))}</Label>
              <box flexDirection="column">
                <Value
                  bold
                >{`${monthTasks} TASK${monthTasks === 1 ? "" : "S"}`}</Value>
                <Value
                  muted
                >{`${monthSummaries.length} DAY${monthSummaries.length === 1 ? "" : "S"} LOGGED`}</Value>
              </box>
            </box>
          ),
        },
      ],
    });
  }
  gridRows.push({
    key: "body",
    cells: [
      ...(showSidebar
        ? [
            {
              key: "days",
              width: size.sideColumn,
              content: (inner: number) => (
                <Sidebar
                  width={inner}
                  rows={rows}
                  selectedDay={day}
                  today={today}
                  focused={focus === "days" && input.kind === "none"}
                  height={listHeight}
                />
              ),
            },
          ]
        : []),
      {
        key: "tasks",
        content: (inner: number) => (
          <box flexGrow={1} flexDirection="column">
            <Label
              active={tasksFocused}
              right={<Value muted>{day === today ? "TODAY" : ""}</Value>}
            >
              {`Tasks · ${shortDay(day)}`}
            </Label>
            {tasks.length ? (
              <box flexDirection="column" marginTop={1}>
                {tasks.slice(start, start + visibleTasks).map((t, i) => (
                  <Fragment key={t.id}>
                    {i > 0 && <TaskDivider width={inner} />}
                    <ListRow
                      task={t}
                      selected={
                        start + i === selected &&
                        (tasksFocused || editing?.id === t.id)
                      }
                      fill={
                        deleting.value?.id === t.id
                          ? { progress: deleting.progress, tone: "danger" }
                          : pulse?.id === t.id && pulseT < 1
                            ? { progress: easeOut(pulseT), tone: "success" }
                            : undefined
                      }
                    />
                  </Fragment>
                ))}
              </box>
            ) : (
              <Empty
                title="Nothing logged"
                hint={
                  input.kind === "add"
                    ? "Type what you did and press enter"
                    : "Press A to add"
                }
              />
            )}
          </box>
        ),
      },
    ],
  });
  gridRows.push({
    key: "input",
    height: 1,
    cells: [
      {
        key: "input-label",
        width: size.sideColumn,
        content: (
          <Label active={input.kind !== "none"}>
            {editing ? `Edit ${to12h(editing.time)}` : "New task"}
          </Label>
        ),
      },
      {
        key: "input-field",
        content: (
          <InputField
            focused={input.kind !== "none"}
            resetKey={`${input.kind}-${resetKey}`}
            initial={editing ? `${to12h(editing.time)} ${editing.text}` : ""}
            placeholder="What are you working on?  (start with 9:30 pm to set the time)"
            idleHint="PRESS A TO ADD A TASK"
            onSubmit={submit}
          />
        ),
      },
    ],
  });
  gridRows.push({
    key: "keys",
    height: 1,
    cells: [
      {
        key: "status",
        content: (
          <StatusLine
            hints={hints}
            note={app.displayPath(app.services.dataDir)}
          />
        ),
      },
    ],
  });

  return <Grid width={width} rows={gridRows} />;
}
