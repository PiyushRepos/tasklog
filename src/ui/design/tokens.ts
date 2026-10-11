import { TextAttributes } from "@opentui/core";

/**
 * Monochrome "instrument panel" palettes. Contrast is measured against `bg`.
 * Hue is reserved for two meanings only: destructive / error (`danger`) and restore (`success`).
 */
const dark = {
  bg: "#141414", // background: deep but not pure black
  surface: "#202020", // selected row, hovered button (big area, small step reads)
  line: "#2e2e2e", // hairline grid (thin glyphs need more contrast than surface)
  meterOff: "#333333", // unfilled meter bars (decorative)
  muted: "#8f8f8f", // secondary info, ~5.7:1
  label: "#c2c2c2", // UPPERCASE labels, ~10.4:1
  text: "#f4f4f4", // body text and numbers, ~16.8:1
  danger: "#ff5f56", // delete forever, errors, ~6.2:1
  success: "#7ee787", // restore progress (light green)
};

const light: typeof dark = {
  bg: "#f6f5f1", // warm paper: less glare than pure white
  surface: "#ebe9e3", // selected row
  line: "#dad7cf", // hairline grid
  meterOff: "#d2cfc6", // unfilled meter bars
  muted: "#6b6963", // ~5.0:1
  label: "#3a3936", // ~10.6:1
  text: "#1c1b19", // soft ink, not pure black, ~15.8:1 (matches dark)
  danger: "#c4271f", // ~5.3:1
  success: "#2ea043",
};

export type Palette = typeof dark;

/** Built-ins can't be overridden; custom themes extend dark or light via `base`. */
export const builtinThemes: Record<string, Palette> = {
  dark,
  light,
  midnight: {
    ...dark,
    bg: "#0f1117",
    surface: "#1a1d26",
    line: "#262a36",
    meterOff: "#2c3140",
    muted: "#8b93a7", // ~6.3:1
    label: "#c3c9d6",
    text: "#eef1f7",
  },
  forest: {
    ...dark,
    bg: "#0f1a14",
    surface: "#17261d",
    line: "#22382a",
    meterOff: "#2a4233",
    muted: "#8aa394", // ~6.5:1
    label: "#bcd0c3",
    text: "#e6f2ea",
    success: "#5fd68a",
  },
  sepia: {
    ...light,
    bg: "#f4ecd8",
    surface: "#e9dfc6",
    line: "#d9cbaa",
    meterOff: "#d2c3a0",
    muted: "#6e5f48", // ~5.2:1
    label: "#5a4a33",
    text: "#3b2f1e",
  },
};

/** The live palette. Mutated in place by `applyTheme`; views read it on every render. */
export const color = { ...dark };

export function applyTheme(palette: Palette) {
  Object.assign(color, palette);
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Built-in names first, then the user's custom themes from config.json. */
export const themeNames = (custom: Record<string, unknown> = {}) => [
  ...Object.keys(builtinThemes),
  ...Object.keys(custom).filter((n) => !(n in builtinThemes)),
];

/**
 * Turns a theme name plus the user's `themes` config into a full palette.
 * Bad input never breaks the app: anything invalid falls back to the base and is reported.
 */
export function resolveTheme(
  name: string,
  custom: Record<string, unknown> = {},
): { palette: Palette; warnings: string[] } {
  if (builtinThemes[name])
    return { palette: builtinThemes[name]!, warnings: [] };
  const spec = custom[name];
  if (!spec || typeof spec !== "object")
    return {
      palette: dark,
      warnings: [`theme "${name}" not found, using dark`],
    };
  const { base = "dark", ...colors } = spec as Record<string, unknown>;
  const warnings: string[] = [];
  if (base !== "dark" && base !== "light")
    warnings.push(`${name}: base "${base}" unknown, using dark`);
  const palette = { ...(base === "light" ? light : dark) };
  for (const [key, value] of Object.entries(colors)) {
    if (!(key in palette)) warnings.push(`${name}: unknown color "${key}"`);
    else if (typeof value !== "string" || !HEX.test(value))
      warnings.push(`${name}: ${key} "${value}" ignored, use #rrggbb`);
    else palette[key as keyof Palette] = value;
  }
  return { palette, warnings };
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
