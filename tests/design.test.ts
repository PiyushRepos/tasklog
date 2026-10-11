import { expect, test } from "bun:test";
import { lineStops, resolveWidths, rule } from "../src/ui/design/grid";
import { chipsWidth } from "../src/ui/design/key-chip";
import { meterFill } from "../src/ui/design/meter";
import { easeOut, mix } from "../src/ui/design/motion";
import {
  builtinThemes,
  resolveTheme,
  themeNames,
} from "../src/ui/design/tokens";

test("widths fill the row exactly", () => {
  expect(resolveWidths(100, [24, undefined, 26])).toEqual([24, 50, 26]);
  expect(resolveWidths(11, [undefined, undefined])).toEqual([5, 6]);
});

test("rules join vertical lines from above and below", () => {
  const top = lineStops([3, 4]); // [0, 3, 6]
  const bottom = lineStops([5, 2]); // [0, 5, 6]
  expect(rule(7, null, top)).toBe("┌──┬──┐");
  expect(rule(7, top, bottom)).toBe("├──┴─┬┤");
  expect(rule(7, bottom, null)).toBe("└────┴┘");
  expect(rule(7, top, top)).toBe("├──┼──┤");
});

test("meter lights a bar for any progress and never overflows", () => {
  expect(meterFill(10, 0, 5)).toBe(0);
  expect(meterFill(10, 1, 100)).toBe(1);
  expect(meterFill(10, 3, 5)).toBe(6);
  expect(meterFill(10, 9, 5)).toBe(10);
  expect(meterFill(10, 1, 0)).toBe(0);
});

test("motion helpers", () => {
  expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
  expect(easeOut(0)).toBe(0);
  expect(easeOut(1)).toBe(1);
  expect(easeOut(0.5)).toBeGreaterThan(0.5); // fast start
  expect(
    chipsWidth([
      ["A", "add"],
      ["/", "search"],
    ]),
  ).toBe(" A  add".length + 3 + " /  search".length);
});

test("custom themes extend a base; bad values fall back and are reported", () => {
  const themes = {
    paper: { base: "light", bg: "#f4ecd8", text: "nope", glow: "#ffffff" },
    dark: { bg: "#ff0000" }, // built-ins can't be overridden
  };
  const { palette, warnings } = resolveTheme("paper", themes);
  expect(palette.bg).toBe("#f4ecd8");
  expect(palette.text).toBe(builtinThemes.light!.text);
  expect(warnings).toHaveLength(2);
  expect(resolveTheme("dark", themes).palette).toEqual(builtinThemes.dark!);
  expect(resolveTheme("missing").warnings[0]).toContain("not found");
  expect(themeNames({ ...themes, sepia: {}, ocean: {} })).toEqual([
    "dark",
    "light",
    "midnight",
    "forest",
    "sepia",
    "paper",
    "ocean",
  ]);
});
