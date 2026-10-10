import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

/** Write to a temp file then rename, so a crash never leaves a half-written file. */
export async function atomicWrite(
  path: string,
  content: string,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, content, "utf8");
  await rename(tmp, path);
}

/** File contents, or undefined when the file does not exist. Other errors propagate. */
export async function readIfExists(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (e) {
    if (isNotFound(e)) return undefined;
    throw e;
  }
}

export const isNotFound = (e: unknown) =>
  (e as NodeJS.ErrnoException)?.code === "ENOENT";

export function expandPath(path: string): string {
  const p = path.trim();
  if (p === "~") return homedir();
  if (p.startsWith("~/") || p.startsWith("~\\"))
    return resolve(homedir(), p.slice(2));
  return resolve(p);
}

/** "/home/me/tasklog" → "~/tasklog" for display. */
export function tildify(path: string): string {
  const home = homedir();
  return path === home ||
    path.startsWith(home + "/") ||
    path.startsWith(home + "\\")
    ? "~" + path.slice(home.length)
    : path;
}
