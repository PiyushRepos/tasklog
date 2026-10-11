import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useCallback, useEffect, useState } from "react";
import type { Task, TrashedTask } from "../../domain/task";
import {
  Button,
  Empty,
  Grid,
  Label,
  ListRow,
  motion,
  size,
  StatusLine,
  Value,
} from "../design";
import { char, clamp, isDown, isUp, windowStart } from "../hooks/keys";
import { usePending } from "../hooks/use-pending";
import { useApp } from "../services-context";

interface TrashScreenProps {
  onRestored(task: Task): void;
  onBack(): void;
}

/** Restore is one key. Delete forever needs the same key twice inside the confirm window. */
export function TrashScreen({ onRestored, onBack }: TrashScreenProps) {
  const { services, toast, clock, toggleTheme } = useApp();
  const { width, height } = useTerminalDimensions();
  const [items, setItems] = useState<TrashedTask[]>([]);
  const [index, setIndex] = useState(0);
  const [armed, setArmed] = useState<{ id: string; at: number } | null>(null);
  const fail = (e: Error) => toast(e.message, "danger");

  const load = useCallback(
    () => services.tasks.listTrash().then((list) => setItems(list.reverse())),
    [services],
  );
  useEffect(() => {
    load().catch(fail);
  }, [load]);

  // Disarm when the confirm window runs out.
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(null), motion.confirmWindowMs);
    return () => clearTimeout(id);
  }, [armed]);

  const selected = clamp(index, 0, Math.max(0, items.length - 1));
  const current = items[selected];

  // Pending restore: a green fill runs across the row; esc cancels, r again (or the fill finishing) commits.
  const restoring = usePending<TrashedTask>(motion.deleteWindowMs);
  const cancelRestore = () => {
    const task = restoring.cancel();
    if (task) toast(`Left “${task.text}” in trash`, "info");
  };
  const restore = () => {
    if (restoring.isActive()) return restoring.commit();
    const task = current;
    if (!task) return;
    restoring.start(task, () =>
      services.tasks
        .restore(task.id)
        .then((t) => {
          toast(`Restored “${t.text}” to ${t.day}`, "success");
          onRestored(t);
        })
        .catch(fail),
    );
  };

  const purge = () => {
    if (!current) return;
    if (armed?.id === current.id) {
      setArmed(null);
      return services.tasks
        .purge(current.id)
        .then(load)
        .then(() => toast(`Deleted “${current.text}” forever`, "danger"))
        .catch(fail);
    }
    setArmed({ id: current.id, at: clock.now().getTime() });
  };

  useKeyboard((key) => {
    const c = char(key);
    if (restoring.isActive() && key.name === "escape") return cancelRestore();
    if (key.name === "escape" || c === "q" || c === "T") return onBack();
    if (isUp(key) || isDown(key)) {
      cancelRestore();
      setArmed(null);
      return setIndex(
        clamp(
          selected + (isUp(key) ? -1 : 1),
          0,
          Math.max(0, items.length - 1),
        ),
      );
    }
    if (c === "m") return toggleTheme();
    // chips show keycaps: "R" means the r key, either case works
    if (c === "r" || c === "R" || key.name === "return") return restore();
    if (c === "d" || c === "D" || key.name === "delete") return purge();
  });

  const listHeight = Math.max(1, height - 6);
  const start = windowStart(selected, items.length, listHeight);
  return (
    <Grid
      width={width}
      rows={[
        {
          key: "body",
          cells: [
            {
              key: "list",
              content: (
                <box flexGrow={1} flexDirection="column">
                  <Label
                    active
                    right={<Value muted>{`${items.length} DELETED`}</Value>}
                  >
                    Trash
                  </Label>
                  {items.length ? (
                    items.slice(start, start + listHeight).map((t, i) => (
                      <ListRow
                        key={t.id}
                        task={t}
                        selected={start + i === selected}
                        prefix={t.day}
                        suffix={`deleted ${ago(t.deletedAt, clock.now())}`}
                        fill={
                          restoring.value?.id === t.id
                            ? {
                                progress: restoring.progress,
                                tone: "success",
                              }
                            : undefined
                        }
                      />
                    ))
                  ) : (
                    <Empty
                      title="Trash is empty"
                      hint="Deleted tasks wait here until you restore them"
                    />
                  )}
                </box>
              ),
            },
            {
              key: "actions",
              width: size.statColumn,
              content: (buttonWidth) => (
                <box flexDirection="column">
                  <Label>Actions</Label>
                  <Button
                    width={buttonWidth}
                    hotkey="R"
                    label="Restore"
                    onPress={restore}
                    disabled={!current}
                  />
                  <Button
                    width={buttonWidth}
                    hotkey="D"
                    label={armed ? "Press D again" : "Delete forever"}
                    onPress={purge}
                    danger
                    armedAt={armed?.at ?? null}
                    disabled={!current}
                  />
                  <Button
                    width={buttonWidth}
                    hotkey="⎋"
                    label="Back"
                    onPress={onBack}
                  />
                </box>
              ),
            },
          ],
        },
        {
          key: "keys",
          height: 1,
          cells: [
            {
              key: "status",
              content: (
                <StatusLine
                  hints={
                    restoring.value
                      ? [
                          ["ESC", "cancel restore"],
                          ["R", "restore now"],
                        ]
                      : [
                          ["↑↓", "move"],
                          ["R", "restore"],
                          ["D D", "delete forever"],
                          ["ESC", "back"],
                        ]
                  }
                />
              ),
            },
          ],
        },
      ]}
    />
  );
}

function ago(iso: string, now: Date): string {
  const s = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(s)) return "";
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
