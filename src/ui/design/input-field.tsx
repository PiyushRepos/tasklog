import { color, glyph } from "./tokens";

interface InputFieldProps {
  focused: boolean;
  /** Changing this remounts the input, which resets its text to `initial`. */
  resetKey: string | number;
  initial?: string;
  placeholder: string;
  /** Shown instead of the input while it does not have focus (the row never disappears, so nothing jumps). */
  idleHint: string;
  onInput?: (value: string) => void;
  onSubmit: (value: string) => void;
}

/** `› text` single-line input. The caret is the only focus indicator; no motion. */
export function InputField({
  focused,
  resetKey,
  initial = "",
  placeholder,
  idleHint,
  onInput,
  onSubmit,
}: InputFieldProps) {
  return (
    <box height={1} flexDirection="row">
      <text fg={focused ? color.text : color.muted}>{glyph.prompt} </text>
      {focused ? (
        <input
          key={resetKey}
          flexGrow={1}
          value={initial}
          placeholder={placeholder}
          focused
          textColor={color.text}
          placeholderColor={color.muted}
          cursorColor={color.text}
          onInput={onInput}
          // Input emits ENTER with the value; the typings merge in Textarea's SubmitEvent signature.
          onSubmit={onSubmit as never}
        />
      ) : (
        <text fg={color.muted} wrapMode="none">
          {idleHint}
        </text>
      )}
    </box>
  );
}
