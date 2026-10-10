import { useTerminalDimensions } from "@opentui/react";
import { useApp } from "../services-context";
import { chipsWidth, KeyChips, type Hint } from "./key-chip";
import { easeOut, mix, motion, useProgress } from "./motion";
import { color, glyph, type Tone } from "./tokens";

const TONE_GLYPH: Record<Tone, string> = {
  info: "·",
  success: glyph.ok,
  warn: "·",
  danger: glyph.error,
};

/**
 * Bottom row: the current toast, otherwise the keys that work right now, with an optional right-side note.
 * Toast enters with a 140ms ease-out fade from the grid line colour and leaves instantly.
 */
export function StatusLine({ hints, note }: { hints: Hint[]; note?: string }) {
  const width = useTerminalDimensions().width - 4; // full-width grid row: 2 borders + 2 padding
  // Drop trailing chips, then the note, rather than letting anything get cut mid-word.
  let shown = hints;
  while (shown.length > 1 && chipsWidth(shown) > width)
    shown = shown.slice(0, -1);
  const showNote = note && chipsWidth(shown) + note.length + 2 <= width;
  const { currentToast } = useApp();
  const t = easeOut(useProgress(currentToast, motion.toastEnterMs));
  const target = currentToast?.tone === "danger" ? color.danger : color.text;
  return (
    <box
      height={1}
      flexDirection="row"
      justifyContent="space-between"
      overflow="hidden"
    >
      {currentToast ? (
        <text wrapMode="none" fg={mix(color.line, target, t)}>
          {TONE_GLYPH[currentToast.tone]} {currentToast.text}
        </text>
      ) : (
        <KeyChips hints={shown} />
      )}
      {showNote ? (
        <text wrapMode="none" fg={color.muted}>
          {note}
        </text>
      ) : null}
    </box>
  );
}
