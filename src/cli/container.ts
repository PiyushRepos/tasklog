import { ExportService } from "../application/export-service";
import { SearchService } from "../application/search-service";
import { SettingsService } from "../application/settings-service";
import { TaskService } from "../application/task-service";
import type { Clock, ConfigStore } from "../domain/ports";
import { MarkdownTaskRepository } from "../infrastructure/markdown/md-task-repository";
import { MarkdownTrashRepository } from "../infrastructure/markdown/md-trash-repository";
import { MonthIndexWriter } from "../infrastructure/markdown/month-index-writer";

/** Composition root: the only place concrete adapters are wired to use cases. */
export function createDataServices(dataDir: string, clock: Clock) {
  const repo = new MarkdownTaskRepository(
    dataDir,
    new MonthIndexWriter(dataDir),
  );
  return {
    dataDir,
    tasks: new TaskService(repo, new MarkdownTrashRepository(dataDir), clock),
    search: new SearchService(repo),
    exporter: new ExportService(repo),
  };
}

export type DataServices = ReturnType<typeof createDataServices>;

export const createSettingsService = (store: ConfigStore, clock: Clock) =>
  new SettingsService(store, clock);
