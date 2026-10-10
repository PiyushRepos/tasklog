import { color, glyph } from "./tokens";

/** How many of `width` bars are lit for value/total. Never lights a bar for 0, always lights one for >0. */
export function meterFill(width: number, value: number, total: number): number {
  if (width <= 0 || total <= 0 || value <= 0) return 0;
  return Math.min(width, Math.max(1, Math.round((width * value) / total)));
}

/** Striped bar: lit bars in text colour, the rest in the dim meter colour. */
export function Meter({
  width,
  value,
  total,
}: {
  width: number;
  value: number;
  total: number;
}) {
  const lit = meterFill(width, value, total);
  return (
    <text wrapMode="none">
      <span fg={color.text}>{glyph.bar.repeat(lit)}</span>
      <span fg={color.meterOff}>
        {glyph.bar.repeat(Math.max(0, width - lit))}
      </span>
    </text>
  );
}
