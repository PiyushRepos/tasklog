import type { KeyEvent } from "@opentui/core";

/** The printable character of a key press ("A" for shift+a), or "" for special keys. */
export const char = (key: KeyEvent) =>
  key.sequence?.length === 1 && !key.ctrl && !key.meta ? key.sequence : "";

export const isUp = (key: KeyEvent) =>
  key.name === "up" || (key.ctrl && key.name === "p") || char(key) === "k";
export const isDown = (key: KeyEvent) =>
  key.name === "down" || (key.ctrl && key.name === "n") || char(key) === "j";
/** Arrow-only variants for lists driven while an input has focus. */
export const isArrowUp = (key: KeyEvent) =>
  key.name === "up" || (key.ctrl && key.name === "p");
export const isArrowDown = (key: KeyEvent) =>
  key.name === "down" || (key.ctrl && key.name === "n");

/** First visible row so `selected` stays in view, keeping it centred while scrolling. */
export function windowStart(
  selected: number,
  count: number,
  height: number,
): number {
  if (count <= height) return 0;
  return Math.min(
    Math.max(0, selected - Math.floor(height / 2)),
    count - height,
  );
}

export const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);
