import { useEffect, useState } from "react";
import { motion, reducedMotion, useProgress } from "./motion";
import { color } from "./tokens";

interface ButtonProps {
  hotkey: string;
  label: string;
  onPress(): void;
  /** Destructive styling (only used once the action is armed). */
  danger?: boolean;
  /** While set, the button drains from full to empty over the confirm window (key = arm time). */
  armedAt?: number | null;
  disabled?: boolean;
  /** Outer width in columns; the label is padded so fills span the whole button. */
  width: number;
}

/**
 * Outlined action like the reference's CANCEL / PAUSE.
 * Micro-interactions: 120ms inverse flash on mouse press; linear drain while a destructive action is armed.
 * Keyboard presses do not flash, since the result itself is the feedback.
 */
export function Button({
  hotkey,
  label,
  onPress,
  danger,
  armedAt,
  disabled,
  width,
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const [hover, setHover] = useState(false);
  const drained = useProgress(armedAt ?? null, motion.confirmWindowMs);

  useEffect(() => {
    if (!pressed) return;
    const id = setTimeout(
      () => setPressed(false),
      reducedMotion() ? 0 : motion.pressMs,
    );
    return () => clearTimeout(id);
  }, [pressed]);

  const armed = armedAt != null;
  const accent = danger && armed ? color.danger : color.text;
  const text = ` ${hotkey}  ${label.toUpperCase()}`.padEnd(
    Math.max(0, width - 2),
  );
  return (
    <box
      height={3}
      width={width}
      flexShrink={0}
      border
      borderStyle="single"
      borderColor={
        disabled ? color.line : armed || pressed || hover ? accent : color.muted
      }
      backgroundColor={
        pressed ? accent : hover && !disabled ? color.surface : undefined
      }
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onMouseDown={() => {
        if (disabled) return;
        setPressed(true);
        onPress();
      }}
    >
      {armed ? (
        <ArmedFill text={text} remaining={1 - drained} accent={accent} />
      ) : (
        <text
          wrapMode="none"
          fg={disabled ? color.muted : pressed ? color.bg : color.text}
        >
          {text}
        </text>
      )}
    </box>
  );
}

/** Inverse fill that shrinks left-to-right as the confirm window runs out (hold-to-delete, inverted for keys). */
function ArmedFill({
  text,
  remaining,
  accent,
}: {
  text: string;
  remaining: number;
  accent: string;
}) {
  return (
    <box flexDirection="row" flexGrow={1}>
      <text wrapMode="none">
        <span fg={color.bg} bg={accent}>
          {text.slice(0, Math.ceil(text.length * remaining))}
        </span>
        <span fg={accent}>
          {text.slice(Math.ceil(text.length * remaining))}
        </span>
      </text>
    </box>
  );
}
