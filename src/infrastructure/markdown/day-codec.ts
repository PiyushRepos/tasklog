import {
  dayTitle,
  parseTimePrefix,
  to12h,
  type DayKey,
  type Task,
  type TrashedTask,
} from "../../domain/task";

/**
 * One task per line:  `- [x] 9:14 AM Fix login bug <!-- id:k3f9a2 -->`
 * Times are written 12-hour; older 24-hour lines ("21:30") are still read.
 * The HTML comment carries metadata and is invisible when the markdown is rendered.
 */
const TASK_LINE =
  /^\s*[-*]\s+\[( |x|X)\]\s+(?:(\d{1,2}:\d{2}(?:\s*[ap]\.?m\.?)?)\s+)?(.*?)\s*(?:<!--(.*?)-->)?\s*$/i;

type Meta = Record<string, string>;

function parseMeta(raw: string | undefined): Meta {
  const meta: Meta = {};
  for (const pair of (raw ?? "").trim().split(/\s+/).filter(Boolean)) {
    const i = pair.indexOf(":");
    if (i > 0) meta[pair.slice(0, i)] = pair.slice(i + 1);
  }
  return meta;
}

const formatMeta = (meta: Meta) =>
  Object.entries(meta)
    .map(([k, v]) => `${k}:${v}`)
    .join(" ");

/** Stable id for hand-written lines that have none yet (FNV-1a), so it survives re-reads until the next write. */
function fallbackId(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++)
    h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193);
  return "h" + (h >>> 0).toString(36);
}

function parseLine(
  line: string,
  day: DayKey,
  index: number,
): { task: Task; meta: Meta } | undefined {
  const m = TASK_LINE.exec(line);
  if (!m) return undefined;
  const meta = parseMeta(m[4]);
  const time = (m[2] && parseTimePrefix(`${m[2]} x`).time) || "00:00";
  const task: Task = {
    id: meta.id || fallbackId(`${day}|${index}|${line}`),
    day: meta.day || day,
    time,
    text: m[3]!,
    done: m[1] !== " ",
  };
  return { task, meta };
}

const formatLine = (t: Task, meta: Meta) =>
  `- [${t.done ? "x" : " "}] ${to12h(t.time)} ${t.text} <!-- ${formatMeta({ id: t.id, ...meta })} -->`;

export interface DayFile {
  tasks: Task[];
  /** Lines the user wrote that are not tasks (notes, sub-headings). Kept verbatim on rewrite. */
  extra: string[];
}

export function parseDayFile(content: string, day: DayKey): DayFile {
  const tasks: Task[] = [];
  const extra: string[] = [];
  content.split(/\r?\n/).forEach((line, i) => {
    const parsed = parseLine(line, day, i);
    if (parsed) tasks.push({ ...parsed.task, day });
    else if (line.trim() && !(i === 0 && line.startsWith("# ")))
      extra.push(line);
  });
  return { tasks, extra };
}

export function formatDayFile(day: DayKey, file: DayFile): string {
  const body = file.tasks.map((t) => formatLine(t, {})).join("\n");
  const notes = file.extra.length ? `\n\n${file.extra.join("\n")}` : "";
  return `# ${dayTitle(day)}\n\n${body}${notes}\n`;
}

const TRASH_HEADER =
  "# Trash\n\nDeleted tasks. Restore them in tasklog (press T).\n\n";

export function parseTrashFile(content: string): TrashedTask[] {
  return content.split(/\r?\n/).flatMap((line, i) => {
    const parsed = parseLine(line, "", i);
    if (!parsed || !parsed.meta.day) return [];
    return [
      {
        ...parsed.task,
        day: parsed.meta.day,
        deletedAt: parsed.meta.deleted ?? "",
      },
    ];
  });
}

export function formatTrashFile(items: TrashedTask[]): string {
  return (
    TRASH_HEADER +
    items
      .map(({ deletedAt, ...t }) =>
        formatLine(t, { day: t.day, deleted: deletedAt }),
      )
      .join("\n") +
    "\n"
  );
}
