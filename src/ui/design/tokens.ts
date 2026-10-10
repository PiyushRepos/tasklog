import { TextAttributes } from "@opentui/core";

/**
 * Monochrome "instrument panel" palettes. Contrast is measured against `bg`.
 * Hue is reserved for two meanings only: destructive / error (`danger`) and restore (`success`).
 */
const dark = {
  bg: "#0b0b0b",
  surface: "#161616", // selected row, hovered button
  line: "#2c2c2c", // hairline grid (decorative)
  meterOff: "#333333", // unfilled meter bars (decorative)
  muted: "#8f8f8f", // secondary info, ~6.6:1
  label: "#c2c2c2", // UPPERCASE labels, ~11:1
  text: "#f4f4f4", // body text and numbers, ~18:1
  danger: "#ff5f56", // delete forever, errors, ~5.9:1
  success: "#7ee787", // restore progress (light green)
};

const light: typeof dark = {
  bg: "#fafafa",
  surface: "#ececec",
  line: "#d6d6d6",
  meterOff: "#d0d0d0",
  muted: "#6b6b6b", // ~5.2:1
  label: "#3a3a3a", // ~11:1
  text: "#0b0b0b", // ~19:1
  danger: "#c4271f", // ~5.3:1
  success: "#2ea043",
};

export type ThemeName = "dark" | "light";

/** The live palette. Mutated in place by `applyTheme`; views read it on every render. */
export const color = { ...dark };

export function applyTheme(name: ThemeName) {
  Object.assign(color, name === "light" ? light : dark);
}

export const glyph = {
  done: "■",
  open: "□",
  rail: "▌",
  bar: "┃",
  prompt: "›",
  ok: "✓",
  error: "!",
  focus: "■",
} as const;

export const attrs = TextAttributes;

export type Tone = "info" | "success" | "warn" | "danger";

/** Shared layout sizes so columns line up across rows (and grid joins become ┼). */
export const size = {
  sideColumn: 24,
  statColumn: 26,
  padX: 1, // columns between a grid line and content
  statRowMinHeight: 22, // hide the stat row below this terminal height
  sidebarMinWidth: 70, // hide the day list below this terminal width
} as const;
