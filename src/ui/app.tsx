import { useKeyboard, useRenderer, useSelectionHandler } from "@opentui/react";
import { useCallback, useMemo, useState } from "react";
import type { SettingsService } from "../application/settings-service";
import type { Clipboard, Clock, Config } from "../domain/ports";
import { toDayKey, type DayKey } from "../domain/task";
import { color } from "./design";
import { applyTheme, resolveTheme } from "./design/tokens";
import { useToastState } from "./hooks/use-toast";
import {
  AppContext,
  type AppContextValue,
  type DataServices,
} from "./services-context";
import { DayScreen } from "./views/day-screen";
import { HelpScreen } from "./views/help-screen";
import { SearchScreen } from "./views/search-screen";
import { SettingsScreen } from "./views/settings-screen";
import { ThemeScreen } from "./views/theme-screen";
import { TrashScreen } from "./views/trash-screen";

export type Screen = "day" | "search" | "trash" | "settings" | "help" | "theme";

export interface AppProps {
  initial: DataServices;
  settings: SettingsService;
  clipboard: Clipboard;
  clock: Clock;
  /** Builds the services for another data folder (provided by the composition root). */
  openDataDir(dir: string): DataServices;
  displayPath(path: string): string;
  initialTheme?: string;
}

/** Screen switches are instant: they happen tens of times a day and motion would only slow them down. */
export function App({
  initial,
  settings,
  clipboard,
  clock,
  openDataDir,
  displayPath,
  initialTheme = "dark",
}: AppProps) {
  const renderer = useRenderer();
  const { toast: currentToast, show: toast } = useToastState();
  const [services, setServices] = useState(initial);
  const [screen, setScreen] = useState<Screen>("day");
  const [day, setDay] = useState<DayKey>(() => toDayKey(clock.now()));
  const [focusTaskId, setFocusTaskId] = useState<string>();
  const [firstRun, setFirstRun] = useState(true);
  const [lastQuery, setLastQuery] = useState("");
  // An object so repainting the same name (picker revert) still re-renders.
  const [theme, setTheme] = useState({ name: initialTheme });

  // Instant swap, no transition: a full-screen colour fade in a terminal only flickers.
  const previewTheme = useCallback(
    (name: string, themes?: Config["themes"]) => {
      const { palette, warnings } = resolveTheme(name, themes);
      applyTheme(palette);
      renderer.setBackgroundColor(color.bg);
      setTheme({ name });
      return warnings;
    },
    [renderer],
  );
  const show = useCallback(
    (config: Config) => {
      const [warning] = previewTheme(config.theme ?? "dark", config.themes);
      if (warning) toast(warning, "warn");
    },
    [previewTheme, toast],
  );
  const fail = useCallback((e: Error) => toast(e.message, "danger"), [toast]);
  const toggleTheme = useCallback(
    () => void settings.toggleTheme().then(show).catch(fail),
    [settings, show, fail],
  );
  const chooseTheme = useCallback(
    (name: string) => settings.setTheme(name).then(show).catch(fail),
    [settings, show, fail],
  );
  // Mouse capture hides the terminal's own selection, so copy on release like most terminals do.
  const copySelection = useCallback(() => {
    const text = renderer.getSelection()?.getSelectedText();
    if (!text) return false;
    clipboard
      .copy(text)
      .then((ok) =>
        toast(
          ok ? "Copied selection" : "Clipboard unavailable here",
          ok ? "success" : "warn",
        ),
      )
      .catch(fail);
    return true;
  }, [renderer, clipboard, toast, fail]);
  useSelectionHandler(() => void copySelection());

  useKeyboard((key) => {
    // ctrl+t works on every screen, even while typing; plain `m` only where no input is open
    if (key.ctrl && key.name === "t") return toggleTheme();
    // ctrl+c copies a selection (muscle memory) and only quits when nothing is selected
    if (key.ctrl && key.name === "c") {
      if (copySelection()) return renderer.clearSelection();
      renderer.destroy();
    }
  });

  const switchDataDir = useCallback(
    async (path: string) => {
      const config = await settings.changeDataDir(path);
      setServices(openDataDir(config.dataDir));
      return config;
    },
    [settings, openDataDir],
  );

  const ctx = useMemo<AppContextValue>(
    () => ({
      services,
      settings,
      clipboard,
      clock,
      switchDataDir,
      toast,
      currentToast,
      displayPath,
      theme: theme.name,
      toggleTheme,
      chooseTheme,
      previewTheme,
      quit: () => renderer.destroy(),
    }),
    [
      services,
      settings,
      clipboard,
      clock,
      switchDataDir,
      toast,
      currentToast,
      displayPath,
      theme,
      toggleTheme,
      chooseTheme,
      previewTheme,
      renderer,
    ],
  );

  const open = (next: Screen) => {
    setFirstRun(false);
    setFocusTaskId(undefined); // don't re-highlight an old task when coming back to the day screen
    setScreen(next);
  };
  const openDay = (target: DayKey, taskId?: string) => {
    open("day");
    setDay(target);
    setFocusTaskId(taskId);
  };

  return (
    <AppContext.Provider value={ctx}>
      <box flexDirection="column" flexGrow={1} backgroundColor={color.bg}>
        {screen === "day" && (
          <DayScreen
            key={services.dataDir}
            day={day}
            onDayChange={(d) => {
              setFocusTaskId(undefined);
              setDay(d);
            }}
            focusTaskId={focusTaskId}
            startAdding={firstRun}
            onOpen={open}
          />
        )}
        {screen === "search" && (
          <SearchScreen
            initialQuery={lastQuery}
            onOpenTask={(t, q) => {
              setLastQuery(q);
              openDay(t.day, t.id);
            }}
            onBack={(q) => {
              setLastQuery(q);
              open("day");
            }}
          />
        )}
        {screen === "trash" && (
          <TrashScreen
            onRestored={(t) => openDay(t.day, t.id)}
            onBack={() => open("day")}
          />
        )}
        {screen === "settings" && <SettingsScreen onBack={() => open("day")} />}
        {screen === "help" && <HelpScreen onBack={() => open("day")} />}
        {screen === "theme" && <ThemeScreen onBack={() => open("day")} />}
      </box>
    </AppContext.Provider>
  );
}
