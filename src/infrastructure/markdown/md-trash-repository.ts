import { join } from "node:path";
import type { TrashRepository } from "../../domain/ports";
import type { TrashedTask } from "../../domain/task";
import { atomicWrite, readIfExists } from "../fs/files";
import { formatTrashFile, parseTrashFile } from "./day-codec";

/** Soft-deleted tasks in `<root>/.trash.md`, newest last. */
export class MarkdownTrashRepository implements TrashRepository {
  private readonly path: string;

  constructor(root: string) {
    this.path = join(root, ".trash.md");
  }

  async list(): Promise<TrashedTask[]> {
    return parseTrashFile((await readIfExists(this.path)) ?? "");
  }

  async add(task: TrashedTask): Promise<void> {
    await atomicWrite(
      this.path,
      formatTrashFile([...(await this.list()), task]),
    );
  }

  async remove(id: string): Promise<TrashedTask | undefined> {
    const items = await this.list();
    const found = items.find((t) => t.id === id);
    if (found)
      await atomicWrite(
        this.path,
        formatTrashFile(items.filter((t) => t.id !== id)),
      );
    return found;
  }
}
