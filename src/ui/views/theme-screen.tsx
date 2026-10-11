import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useEffect, useState } from "react";
import type { Config } from "../../domain/ports";
import {
  attrs,
  color,
  glyph,
  Grid,
  Label,
  size,
  StatusLine,
  Value,
} from "../design";
import { builtinThemes, themeNames } from "../design/tokens";
import { char, clamp, isDown, isUp } from "../hooks/keys";
import { useApp } from "../services-context";

/** Theme picker. Moving previews instantly; ↵ saves, esc puts the saved theme back. */
export function ThemeScreen({ onBack }: { onBack(): void }) {
  const { settings, toast, displayPath, chooseTheme, previewTheme } = useApp();
  const { width } = useTerminalDimensions();
  const [config, setConfig] = useState<Config | null>(null);
  const [index, setIndex] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Re-read config.json on open, so hand edits show up without a restart.
  useEffect(() => {
    settings
      .load()
      .then((c) => {
        const saved = c.theme ?? "dark";
        setConfig(c);
        setIndex(Math.max(0, themeNames(c.themes).indexOf(saved)));
        setWarnings(previewTheme(saved, c.themes));
      })
      .catch((e: Error) => toast(e.message, "danger"));
  }, []);

  const names = themeNames(config?.themes);
  const saved = config?.theme ?? "dark";
  const selected = clamp(index, 0, names.length - 1);
  const nameWidth = Math.max(...names.map((n) => n.length)) + 2;

  useKeyboard((key) => {
    if (!config) return;
    const c = char(key);
    if (key.name === "escape" || c === "q" || c === "M") {
      previewTheme(saved, config.themes);
      return onBack();
    }
    if (isUp(key) || isDown(key)) {
      const next = clamp(selected + (isUp(key) ? -1 : 1), 0, names.length - 1);
      setIndex(next);
      return setWarnings(previewTheme(names[next]!, config.themes));
    }
    if (key.name === "return") chooseTheme(names[selected]!).then(onBack);
  });

  const describe = (name: string) => {
    if (builtinThemes[name]) return "built-in";
    const base = (config?.themes?.[name] as { base?: unknown } | undefined)
      ?.base;
    return `custom · ${base === "light" ? "light" : "dark"} base`;
  };

  return (
    <Grid
      width={width}
      rows={[
        {
          key: "body",
          cells: [
            {
              key: "list",
              content: (
                <box flexGrow={1} flexDirection="column">
                  <Label active>Themes</Label>
                  {names.map((name, i) => (
                    <box
                      key={name}
                      height={1}
                      flexShrink={0}
                      backgroundColor={
                        i === selected ? color.surface : undefined
                      }
                    >
                      <text wrapMode="none">
                        <span fg={color.text}>
                          {i === selected ? glyph.rail : " "}
                        </span>
                        <span
                          fg={color.text}
                          attributes={i === selected ? attrs.BOLD : 0}
                        >
                          {name.padEnd(nameWidth)}
                        </span>
                        <span fg={color.muted}>{describe(name)}</span>
                        {name === saved ? (
                          <span fg={color.label}>{`  ${glyph.ok} in use`}</span>
                        ) : null}
                      </text>
                    </box>
                  ))}
                  {warnings.map((w) => (
                    <text key={w} wrapMode="none" fg={color.danger}>
                      {`${glyph.error} ${w}`}
                    </text>
                  ))}
                  <box flexGrow={1} />
                  <Value muted>
                    {`ADD YOUR OWN UNDER "themes" IN  ${config ? displayPath(settings.configLocation) : "…"}`}
                  </Value>
                </box>
              ),
            },
            {
              key: "preview",
              width: size.statColumn,
              content: (
                <box flexDirection="column">
                  <Label>Colors</Label>
                  {(Object.keys(color) as Array<keyof typeof color>).map(
                    (k) => (
                      <text key={k} wrapMode="none">
                        <span fg={color[k]}>{"██ "}</span>
                        <span fg={color.label}>{k.padEnd(9)}</span>
                        <span fg={color.muted}>{color[k]}</span>
                      </text>
                    ),
                  )}
                </box>
              ),
            },
          ],
        },
        {
          key: "keys",
          height: 1,
          cells: [
            {
              key: "status",
              content: (
                <StatusLine
                  hints={[
                    ["↑↓", "preview"],
                    ["↵", "use theme"],
                    ["ESC", "back"],
                  ]}
                />
              ),
            },
          ],
        },
      ]}
    />
  );
}
