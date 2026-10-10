import { to12h, type Task } from "../../domain/task";
import { mix } from "./motion";
import { attrs, color, glyph } from "./tokens";

interface ListRowProps {
  task: Task;
  selected: boolean;
  /** Shown before the time, e.g. the day in search results. */
  prefix?: string;
  /** Lowercased words to emphasise. */
  highlight?: string[];
  suffix?: string;
  /** Progress fill behind the row (0..1, left to right): red while deleting, green while restoring. */
  fill?: { progress: number; tone: "danger" | "success" };
}

/** One task line. Selection is instant (no transition): it moves hundreds of times a day. */
export function ListRow({
  task,
  selected,
  prefix,
  highlight = [],
  suffix,
  fill,
}: ListRowProps) {
  const body = task.done ? color.muted : color.text;
  return (
    <box
      height={1}
      flexShrink={0}
      backgroundColor={selected ? color.surface : undefined}
      overflow="hidden"
    >
      {fill ? (
        <box
          position="absolute"
          left={0}
          top={0}
          height={1}
          width={`${Math.round(fill.progress * 100)}%`}
          backgroundColor={mix(color.bg, color[fill.tone], 0.4)}
        />
      ) : null}
      <text wrapMode="none">
        <span fg={color.text}>{selected ? glyph.rail : " "}</span>
        <span fg={task.done ? color.text : color.muted}>
          {`${task.done ? glyph.done : glyph.open} `}
        </span>
        {prefix ? <span fg={color.muted}>{`${prefix}  `}</span> : null}
        <span fg={selected ? color.label : color.muted}>
          {`${to12h(task.time).padStart(8)}  `}
        </span>
        {highlightParts(task.text, highlight).map(([part, hit], i) => (
          <span
            key={i}
            fg={hit ? color.text : body}
            attributes={
              (task.done ? attrs.STRIKETHROUGH : 0) |
              (hit ? attrs.BOLD | attrs.UNDERLINE : 0) |
              (selected && !task.done ? attrs.BOLD : 0)
            }
          >
            {part}
          </span>
        ))}
        {suffix ? <span fg={color.muted}>{`  ${suffix}`}</span> : null}
      </text>
    </box>
  );
}

export function highlightParts(
  text: string,
  terms: string[],
): Array<[string, boolean]> {
  const words = terms
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return [[text, false]];
  const re = new RegExp(`(${words.join("|")})`, "gi");
  const isHit = new RegExp(`^(${words.join("|")})$`, "i");
  return text
    .split(re)
    .filter(Boolean)
    .map((part) => [part, isHit.test(part)]);
}
