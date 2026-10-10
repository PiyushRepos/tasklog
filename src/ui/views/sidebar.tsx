import {
  monthOf,
  parseDay,
  type DayKey,
  type DaySummary,
  type MonthKey,
} from "../../domain/task";
import { attrs, color, glyph, Label } from "../design";
import { windowStart } from "../hooks/keys";

export type SidebarRow =
  | { kind: "month"; month: MonthKey; total: number }
  | { kind: "day"; day: DayKey; total: number; done: number };

/** Months then days, newest first. `alwaysShow` days (today, the selected day) appear even when empty. */
export function buildRows(
  summaries: DaySummary[],
  alwaysShow: DayKey[],
): SidebarRow[] {
  const byDay = new Map(summaries.map((s) => [s.day, s]));
  for (const day of alwaysShow)
    if (!byDay.has(day)) byDay.set(day, { day, total: 0, done: 0 });
  const days = [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
  const rows: SidebarRow[] = [];
  let current: Extract<SidebarRow, { kind: "month" }> | undefined;
  for (const s of days) {
    if (current?.month !== monthOf(s.day)) {
      current = { kind: "month", month: monthOf(s.day), total: 0 };
      rows.push(current);
    }
    current.total += s.total;
    rows.push({ kind: "day", ...s });
  }
  return rows;
}

const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
const MONTH = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
});

interface SidebarProps {
  rows: SidebarRow[];
  selectedDay: DayKey;
  today: DayKey;
  focused: boolean;
  /** Rows available for the list (cell height minus the label). */
  height: number;
  /** Inner cell width, for the rule under each month. */
  width: number;
}

/** Content of the DAYS cell. */
export function Sidebar({
  rows,
  selectedDay,
  today,
  focused,
  height,
  width,
}: SidebarProps) {
  // A blank line before every month (and so under the label) and a faint rule after its heading;
  // both count as lines so scrolling stays exact.
  type Line =
    SidebarRow | { kind: "gap"; key: string } | { kind: "rule"; key: string };
  const lines = rows.flatMap((r): Line[] =>
    r.kind === "month"
      ? [
          { kind: "gap", key: `gap-${r.month}` },
          r,
          { kind: "rule", key: `rule-${r.month}` },
        ]
      : [r],
  );
  const activeMonth = monthOf(selectedDay);
  const selected = lines.findIndex(
    (r) => r.kind === "day" && r.day === selectedDay,
  );
  const start = windowStart(Math.max(selected, 0), lines.length, height);
  return (
    <box flexGrow={1} flexDirection="column">
      <Label active={focused}>Days</Label>
      {lines.slice(start, start + height).map((row) =>
        row.kind === "gap" ? (
          <box key={row.key} height={1} flexShrink={0} />
        ) : row.kind === "rule" ? (
          <text
            key={row.key}
            height={1}
            flexShrink={0}
            wrapMode="none"
            fg={color.line}
          >
            {"┈".repeat(width)}
          </text>
        ) : row.kind === "month" ? (
          <box
            key={row.month}
            height={1}
            flexShrink={0}
            flexDirection="row"
            justifyContent="space-between"
          >
            <text
              fg={row.month === activeMonth ? color.text : color.muted}
              attributes={row.month === activeMonth ? attrs.BOLD : 0}
              wrapMode="none"
            >
              {row.month === activeMonth ? `${glyph.focus} ` : ""}
              {MONTH.format(parseDay(`${row.month}-01`)).toUpperCase()}
            </text>
            <text fg={row.month === activeMonth ? color.label : color.muted}>
              {row.total || ""}
            </text>
          </box>
        ) : (
          <DayLine
            key={row.day}
            row={row}
            selected={row.day === selectedDay}
            focused={focused}
            today={row.day === today}
          />
        ),
      )}
    </box>
  );
}

function DayLine({
  row,
  selected,
  focused,
  today,
}: {
  row: Extract<SidebarRow, { kind: "day" }>;
  selected: boolean;
  focused: boolean;
  today: boolean;
}) {
  const complete = row.total > 0 && row.done === row.total;
  return (
    <box
      height={1}
      flexShrink={0}
      flexDirection="row"
      justifyContent="space-between"
      backgroundColor={selected && focused ? color.surface : undefined}
    >
      <text wrapMode="none">
        <span fg={color.text}>{selected ? glyph.rail : " "}</span>
        <span
          fg={selected ? color.text : row.total ? color.label : color.muted}
          attributes={selected ? attrs.BOLD : 0}
        >
          {WEEKDAY.format(parseDay(row.day)).toUpperCase()} {row.day.slice(8)}
        </span>
        {today ? <span fg={color.muted}> TODAY</span> : null}
      </text>
      <text fg={complete ? color.text : color.muted}>
        {row.total
          ? complete
            ? `${glyph.ok} ${row.total}`
            : `${row.done}/${row.total}`
          : ""}
      </text>
    </box>
  );
}
