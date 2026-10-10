import {
  createClipboard,
  createHostClipboard,
  createRendererClipboardAdapter,
  type CliRenderer,
  type ClipboardService,
} from "@opentui/core";
import type { Clipboard } from "../../domain/ports";

/** System clipboard when available, OSC 52 through the terminal otherwise (works over SSH). */
export class OpenTuiClipboard implements Clipboard {
  private readonly service: ClipboardService;

  constructor(renderer: CliRenderer) {
    this.service = createClipboard({
      host: createHostClipboard(),
      terminal: createRendererClipboardAdapter(renderer),
    });
  }

  async copy(text: string): Promise<boolean> {
    const result = await this.service.writeText(text, {
      destination: "best-available",
    });
    return (
      result.host.status === "written" || result.terminal.status === "attempted"
    );
  }

  dispose(): Promise<void> {
    return this.service.dispose();
  }
}
