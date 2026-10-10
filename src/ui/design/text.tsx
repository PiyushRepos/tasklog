import type { ReactNode } from "react";
import { attrs, color, glyph } from "./tokens";

/** UPPERCASE section label. `active` marks the pane that owns the keyboard. */
export function Label({
  children,
  active,
  right,
}: {
  children: string;
  active?: boolean;
  right?: ReactNode;
}) {
  return (
    <box
      height={1}
      flexShrink={0}
      flexDirection="row"
      justifyContent="space-between"
    >
      <text
        wrapMode="none"
        fg={active ? color.text : color.label}
        attributes={active ? attrs.BOLD : 0}
      >
        {active ? `${glyph.focus} ` : ""}
        {children.toUpperCase()}
      </text>
      {right}
    </box>
  );
}

export function Value({
  children,
  muted,
  bold,
}: {
  children: ReactNode;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <text
      wrapMode="none"
      fg={muted ? color.muted : color.text}
      attributes={bold ? attrs.BOLD : 0}
    >
      {children}
    </text>
  );
}

/** Label on top, value pinned to the bottom of the cell (like "36GB/s"). */
export function Stat({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <box flexGrow={1} flexDirection="column" justifyContent="space-between">
      <Label>{label}</Label>
      <box flexDirection="column">{children}</box>
    </box>
  );
}

/** Centered two-line empty state. */
export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <box
      flexGrow={1}
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
    >
      <text fg={color.label}>{title.toUpperCase()}</text>
      {hint ? <text fg={color.muted}>{hint}</text> : null}
    </box>
  );
}
