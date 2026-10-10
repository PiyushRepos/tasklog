import { createContext, useContext } from "react";
import type { ExportService } from "../application/export-service";
import type { SearchService } from "../application/search-service";
import type { SettingsService } from "../application/settings-service";
import type { TaskService } from "../application/task-service";
import type { Clipboard, Clock, Config } from "../domain/ports";
import type { ThemeName, Tone } from "./design/tokens";
import type { Toast } from "./hooks/use-toast";

/** Use cases bound to one data folder. Replaced as a whole when the folder changes. */
export interface DataServices {
  dataDir: string;
  tasks: TaskService;
  search: SearchService;
  exporter: ExportService;
}

export interface AppContextValue {
  services: DataServices;
  settings: SettingsService;
  clipboard: Clipboard;
  clock: Clock;
  switchDataDir(path: string): Promise<Config>;
  toast(text: string, tone?: Tone): void;
  currentToast: Toast | null;
  quit(): void;
  theme: ThemeName;
  toggleTheme(): void;
  /** Absolute path → "~/…" for display. */
  displayPath(path: string): string;
}

export const AppContext = createContext<AppContextValue | null>(null);

/** Views depend on this abstraction, never on concrete adapters. */
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp() outside <AppContext.Provider>");
  return ctx;
}
