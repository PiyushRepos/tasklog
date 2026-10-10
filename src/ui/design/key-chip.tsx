import { color } from "./tokens";

export type Hint = [key: string, label: string];

/** Columns the chips occupy, so callers can decide what else fits on the line. */
export const chipsWidth = (hints: Hint[]) =>
  hints.reduce(
    (n, [k, label], i) => n + (i ? 3 : 0) + k.length + 3 + label.length,
    0,
  );

/** Inverse key cap followed by its UPPERCASE action: ` A  ADD`. Static: no hover, no motion. */
export function KeyChips({ hints }: { hints: Hint[] }) {
  return (
    <text wrapMode="none">
      {hints.map(([k, label], i) => (
        <span key={k}>
          {i > 0 ? "   " : ""}
          <span fg={color.bg} bg={color.label}>
            {` ${k} `}
          </span>
          <span fg={color.label}> {label.toUpperCase()}</span>
        </span>
      ))}
    </text>
  );
}
