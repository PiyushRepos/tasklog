import type { ReactNode } from "react";
import { color, size } from "./tokens";

export interface GridCell {
  key: string;
  /** Columns including this cell's left border. Omit to share the remaining width. */
  width?: number;
  /** Content, or a function of the usable inner width (for meters and truncation). */
  content: ReactNode | ((innerWidth: number) => ReactNode);
}

export interface GridRow {
  key: string;
  /** Fixed content rows. Omit to take the remaining height. */
  height?: number;
  cells: GridCell[];
}

/** Fixed widths stay; the rest is split between flexible cells. Always sums to `total`. */
export function resolveWidths(
  total: number,
  specs: Array<number | undefined>,
): number[] {
  const flexCount = specs.filter((w) => w === undefined).length;
  const free = Math.max(
    0,
    total - specs.reduce<number>((s, w) => s + (w ?? 0), 0),
  );
  let given = 0;
  let seen = 0;
  return specs.map((w) => {
    if (w !== undefined) return w;
    seen++;
    const share =
      seen === flexCount ? free - given : Math.floor(free / flexCount);
    given += share;
    return share;
  });
}

/** X positions of the vertical lines of a row: every cell's left edge plus the right edge. */
export function lineStops(widths: number[]): number[] {
  const total = widths.reduce((s, w) => s + w, 0);
  const stops: number[] = [];
  let x = 0;
  for (const w of widths) {
    stops.push(x);
    x += w;
  }
  stops.push(total - 1);
  return stops;
}

const JOIN: Record<string, string> = {
  // key: up down left right
  "0101": "┌",
  "0110": "┐",
  "1001": "└",
  "1010": "┘",
  "0111": "┬",
  "1011": "┴",
  "1101": "├",
  "1110": "┤",
  "1111": "┼",
  "0011": "─",
  "1100": "│",
};

/** A horizontal hairline whose joins match the vertical lines above and below it. */
export function rule(
  total: number,
  above: number[] | null,
  below: number[] | null,
): string {
  let out = "";
  for (let x = 0; x < total; x++) {
    const key = [above?.includes(x), below?.includes(x), x > 0, x < total - 1]
      .map((b) => (b ? "1" : "0"))
      .join("");
    out += JOIN[key] ?? "─";
  }
  return out;
}

/**
 * Hairline grid like an instrument panel: no doubled borders, correct ┬ ┼ ┴ joins, zero gaps.
 * Cells draw only vertical lines; horizontal rules are computed text rows.
 */
export function Grid({ width, rows }: { width: number; rows: GridRow[] }) {
  const resolved = rows.map((r) => ({
    ...r,
    widths: resolveWidths(
      width,
      r.cells.map((c) => c.width),
    ),
  }));
  const stops = resolved.map((r) => lineStops(r.widths));
  const ruleRow = (key: string, text: string) => (
    <box key={key} height={1} flexShrink={0}>
      <text fg={color.line} wrapMode="none">
        {text}
      </text>
    </box>
  );
  return (
    <box flexDirection="column" width={width} flexGrow={1}>
      {resolved.flatMap((row, i) => [
        ruleRow(
          `rule-${row.key}`,
          rule(width, i ? stops[i - 1]! : null, stops[i]!),
        ),
        <box
          key={row.key}
          flexDirection="row"
          height={row.height}
          flexGrow={row.height ? 0 : 1}
          flexShrink={row.height ? 0 : 1}
        >
          {row.cells.map((cell, j) => {
            const last = j === row.cells.length - 1;
            const w = row.widths[j]!;
            const inner = Math.max(0, w - (last ? 2 : 1) - 2 * size.padX);
            return (
              <box
                key={cell.key}
                width={w}
                flexShrink={0}
                border={last ? ["left", "right"] : ["left"]}
                borderColor={color.line}
                paddingLeft={size.padX}
                paddingRight={size.padX}
                flexDirection="column"
                overflow="hidden"
              >
                {typeof cell.content === "function"
                  ? cell.content(inner)
                  : cell.content}
              </box>
            );
          })}
        </box>,
      ])}
      {ruleRow("rule-end", rule(width, stops.at(-1) ?? null, null))}
    </box>
  );
}
