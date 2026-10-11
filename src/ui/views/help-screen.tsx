import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { color, Grid, Label, StatusLine } from "../design";
import { char } from "../hooks/keys";
import { useApp } from "../services-context";

type Section = [title: string, keys: Array<[string, string]>];

const SECTIONS: Section[] = [
  [
    "Tasks",
    [
      ["A", "add · 9:30 pm first sets time"],
      ["E  ↵", "edit"],
      ["␣  X", "toggle done"],
      ["D", "delete to trash"],
      ["U", "undo delete"],
    ],
  ],
  [
    "Move",
    [
      ["J K  ↑ ↓", "move"],
      ["TAB  H L", "days ↔ tasks"],
      ["[  ]", "previous / next day"],
      ["T", "today"],
    ],
  ],
  [
    "Find & share",
    [
      ["/", "search words, 2026-10…"],
      ["Y", "copy task"],
      ["C", "copy day"],
      ["⇧C", "copy month"],
      ["⇧Y", "copy year"],
    ],
  ],
  [
    "App",
    [
      ["⇧T", "trash"],
      ["S", "settings · folder history"],
      ["M  ^T", "switch to last theme"],
      ["⇧M", "choose theme"],
      ["?", "this help"],
      ["Q  ^C", "quit"],
    ],
  ],
];

function SectionCell({ section: [title, keys] }: { section: Section }) {
  return (
    <box flexDirection="column">
      <Label>{title}</Label>
      {keys.map(([k, label]) => (
        <text key={k} wrapMode="none">
          <span fg={color.text}>{k.padEnd(11)}</span>
          <span fg={color.label}>{label}</span>
        </text>
      ))}
    </box>
  );
}

export function HelpScreen({ onBack }: { onBack(): void }) {
  const { width } = useTerminalDimensions();
  const { toggleTheme } = useApp();
  useKeyboard((key) => (char(key) === "m" ? toggleTheme() : onBack()));
  return (
    <Grid
      width={width}
      rows={[
        {
          key: "r1",
          cells: SECTIONS.slice(0, 2).map((s) => ({
            key: s[0],
            content: <SectionCell section={s} />,
          })),
        },
        {
          key: "r2",
          cells: SECTIONS.slice(2).map((s) => ({
            key: s[0],
            content: <SectionCell section={s} />,
          })),
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
                    ["M", "theme"],
                    ["ANY KEY", "back"],
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
