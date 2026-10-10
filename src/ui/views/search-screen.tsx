import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import { parseQuery } from "../../application/search-service";
import { dayTitle, type Task } from "../../domain/task";
import {
  color,
  Empty,
  Grid,
  InputField,
  Label,
  ListRow,
  size,
  StatusLine,
  Value,
} from "../design";
import { clamp, isArrowDown, isArrowUp, windowStart } from "../hooks/keys";
import { useApp } from "../services-context";

interface SearchScreenProps {
  initialQuery: string;
  onOpenTask(task: Task, query: string): void;
  onBack(query: string): void;
}

const LIMIT = 500;

export function SearchScreen({
  initialQuery,
  onOpenTask,
  onBack,
}: SearchScreenProps) {
  const { services, toast } = useApp();
  const { width, height } = useTerminalDimensions();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Task[]>([]);
  const [index, setIndex] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const run = ++latest.current;
    services.search
      .search(query, LIMIT)
      .then((r) => {
        if (run !== latest.current) return; // a newer query already started
        setResults(r);
        setIndex(0);
      })
      .catch((e: Error) => toast(e.message, "danger"));
  }, [query, services, toast]);

  useKeyboard((key) => {
    if (key.name === "escape") return onBack(query);
    if (isArrowUp(key) || isArrowDown(key))
      setIndex((i) =>
        clamp(
          i + (isArrowUp(key) ? -1 : 1),
          0,
          Math.max(0, results.length - 1),
        ),
      );
  });

  const listHeight = Math.max(1, height - 8);
  const selected = clamp(index, 0, Math.max(0, results.length - 1));
  const start = windowStart(selected, results.length, listHeight);
  const parsed = parseQuery(query);
  const hasQuery = query.trim().length > 0;
  const days = new Set(results.map((r) => r.day)).size;

  return (
    <Grid
      width={width}
      rows={[
        {
          key: "query",
          height: 1,
          cells: [
            {
              key: "label",
              width: size.sideColumn,
              content: <Label active>Search</Label>,
            },
            {
              key: "field",
              content: (
                <InputField
                  focused
                  resetKey="search"
                  initial={initialQuery}
                  placeholder="login bug   ·   2026-10 standup"
                  idleHint=""
                  onInput={setQuery}
                  onSubmit={() => {
                    const task = results[selected];
                    if (task) onOpenTask(task, query);
                  }}
                />
              ),
            },
          ],
        },
        {
          key: "body",
          cells: [
            {
              key: "results",
              content: (
                <box flexGrow={1} flexDirection="column">
                  <Label>Results</Label>
                  {results.length ? (
                    results
                      .slice(start, start + listHeight)
                      .map((t, i) => (
                        <ListRow
                          key={t.day + t.id}
                          task={t}
                          selected={start + i === selected}
                          prefix={dayTitle(t.day).toUpperCase()}
                          highlight={parsed.terms}
                        />
                      ))
                  ) : (
                    <Empty
                      title={
                        hasQuery ? "No matches" : "Search every day you logged"
                      }
                      hint={
                        hasQuery
                          ? "Try fewer words"
                          : "Words match text · 2026, 2026-10, 2026-10-10 narrow by date"
                      }
                    />
                  )}
                </box>
              ),
            },
            {
              key: "matches",
              width: size.statColumn,
              content: (
                <box
                  flexGrow={1}
                  flexDirection="column"
                  justifyContent="space-between"
                >
                  <Label>Matches</Label>
                  <box flexDirection="column">
                    {hasQuery ? (
                      <>
                        <ascii-font
                          text={`${results.length}${results.length >= LIMIT ? "+" : ""}`}
                          font="tiny"
                          color={color.text}
                        />
                        <Value>{`${results.length === 1 ? "MATCH" : "MATCHES"} · ${days} DAY${days === 1 ? "" : "S"}`}</Value>
                        {parsed.dates.length ? (
                          <Value muted>{`IN ${parsed.dates.join(", ")}`}</Value>
                        ) : null}
                      </>
                    ) : (
                      <Value muted>TYPE TO SEARCH</Value>
                    )}
                  </box>
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
                  hints={[
                    ["↑↓", "move"],
                    ["↵", "open day"],
                    ["ESC", "back"],
                  ]}
                />
              ),
            },
          ],
        },
      ]}
    />
  );
}
