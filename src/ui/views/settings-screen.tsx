import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useEffect, useState } from "react";
import type { Config } from "../../domain/ports";
import {
  attrs,
  Button,
  color,
  glyph,
  Grid,
  InputField,
  Label,
  size,
  StatusLine,
  Value,
  type Hint,
} from "../design";
import { char, clamp, isDown, isUp } from "../hooks/keys";
import { useApp } from "../services-context";

/** Data folder, config location and every folder used before. */
export function SettingsScreen({ onBack }: { onBack(): void }) {
  const { settings, switchDataDir, toast, displayPath, toggleTheme } = useApp();
  const { width } = useTerminalDimensions();
  const [config, setConfig] = useState<Config | null>(null);
  const [editing, setEditing] = useState(false);
  const [index, setIndex] = useState(0);
  const fail = (e: Error) => toast(e.message, "danger");

  useEffect(() => {
    settings.load().then(setConfig).catch(fail);
  }, [settings]);

  const history = [...(config?.history ?? [])].reverse();
  const selected = clamp(index, 0, Math.max(0, history.length - 1));

  const change = (path: string) =>
    switchDataDir(path)
      .then((c) => {
        setConfig(c);
        setEditing(false);
        toast(
          `Now saving to ${displayPath(c.dataDir)} · previous folder kept in history`,
          "success",
        );
      })
      .catch(fail);
  const switchToSelected = () =>
    history[selected] && change(history[selected]!.path);

  useKeyboard((key) => {
    if (editing) {
      if (key.name === "escape") setEditing(false);
      return;
    }
    const c = char(key);
    if (key.name === "escape" || c === "q" || c === "s") return onBack();
    if (c === "e" || c === "c") return setEditing(true);
    if (c === "m") return toggleTheme();
    if (isUp(key) || isDown(key))
      return setIndex(
        clamp(
          selected + (isUp(key) ? -1 : 1),
          0,
          Math.max(0, history.length - 1),
        ),
      );
    if (key.name === "return") switchToSelected();
  });

  return (
    <Grid
      width={width}
      rows={[
        {
          key: "stats",
          height: 3,
          cells: [
            {
              key: "folder",
              content: (
                <box
                  flexGrow={1}
                  flexDirection="column"
                  justifyContent="space-between"
                >
                  <Label>Data folder</Label>
                  <Value bold>
                    {config ? displayPath(config.dataDir) : "…"}
                  </Value>
                </box>
              ),
            },
            {
              key: "since",
              width: size.statColumn,
              content: (
                <box
                  flexGrow={1}
                  flexDirection="column"
                  justifyContent="space-between"
                >
                  <Label>Since</Label>
                  <Value>{config?.dataDirSince ?? ""}</Value>
                </box>
              ),
            },
          ],
        },
        {
          key: "body",
          cells: [
            {
              key: "history",
              content: (
                <box flexGrow={1} flexDirection="column">
                  <Label active={!editing}>Previous folders</Label>
                  {history.length ? (
                    history.map((h, i) => (
                      <box
                        key={`${h.path}-${i}`}
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
                            {displayPath(h.path)}
                          </span>
                          <span fg={color.muted}>
                            {`  ${h.from} → ${h.to}`}
                          </span>
                        </text>
                      </box>
                    ))
                  ) : (
                    <Value muted>
                      None yet. Changing folders keeps a record here, so old
                      tasks are never lost.
                    </Value>
                  )}
                  <box flexGrow={1} />
                  <Value
                    muted
                  >{`CONFIG  ${displayPath(settings.configLocation)}`}</Value>
                </box>
              ),
            },
            {
              key: "actions",
              width: size.statColumn,
              content: (buttonWidth) => (
                <box flexDirection="column">
                  <Label>Actions</Label>
                  <Button
                    width={buttonWidth}
                    hotkey="E"
                    label="Change folder"
                    onPress={() => setEditing(true)}
                  />
                  <Button
                    width={buttonWidth}
                    hotkey="↵"
                    label="Switch back"
                    onPress={switchToSelected}
                    disabled={!history.length}
                  />
                  <Button
                    width={buttonWidth}
                    hotkey="⎋"
                    label="Back"
                    onPress={onBack}
                  />
                </box>
              ),
            },
          ],
        },
        {
          key: "input",
          height: 1,
          cells: [
            {
              key: "label",
              width: size.sideColumn,
              content: <Label active={editing}>New folder</Label>,
            },
            {
              key: "field",
              content: (
                <InputField
                  focused={editing}
                  resetKey="path"
                  initial={config?.dataDir ?? ""}
                  placeholder="/path/to/folder or ~/folder"
                  idleHint="PRESS E TO CHANGE THE DATA FOLDER"
                  onSubmit={change}
                />
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
                  hints={
                    editing
                      ? [
                          ["↵", "save"],
                          ["ESC", "cancel"],
                        ]
                      : [
                          ["E", "change folder"],
                          ...(history.length
                            ? [["↵", "switch back"] as Hint]
                            : []),
                          ["ESC", "back"],
                        ]
                  }
                />
              ),
            },
          ],
        },
      ]}
    />
  );
}
